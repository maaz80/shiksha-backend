import WhatsAppLead from "../models/WhatsAppLead.js";
import WhatsAppMessage from "../models/WhatsAppMessage.js";
import { processConversation } from "../services/whatsappChatbotService.js";
import { sendWhatsAppText } from "../services/whatsappService.js";

/**
 * 1. GET /api/whatsapp/webhook - Webhook Verification Endpoint called by Meta
 */
export const verifyWebhook = (req, res) => {
  let mode, token, challenge;
  try {
    const rawUrl = req.originalUrl || req.url || "";
    const parsedUrl = new URL(rawUrl, "http://localhost");
    mode = parsedUrl.searchParams.get("hub.mode") || req.query?.["hub.mode"] || req.query?.mode;
    token = (
      parsedUrl.searchParams.get("hub.verify_token") ||
      req.query?.["hub.verify_token"] ||
      req.query?.verify_token ||
      ""
    ).trim();
    challenge = parsedUrl.searchParams.get("hub.challenge") || req.query?.["hub.challenge"] || req.query?.challenge;
  } catch (e) {
    mode = req.query?.["hub.mode"] || req.query?.mode;
    token = (req.query?.["hub.verify_token"] || req.query?.verify_token || "").trim();
    challenge = req.query?.["hub.challenge"] || req.query?.challenge;
  }

  const configuredToken = (process.env.META_VERIFY_TOKEN || "").trim();

  console.log("🔍 Meta Webhook Verification Request:", { mode, token, configuredToken });

  if (mode === "subscribe" && token && token === configuredToken) {
    console.log("✅ Meta WhatsApp Webhook Verified! Returning challenge:", challenge);
    return res.status(200).send(String(challenge || ""));
  }

  console.warn("❌ Webhook Verification Failed: Token mismatch or invalid mode.");
  return res.status(403).send("Forbidden: Token mismatch");
};

/**
 * 2. POST /api/whatsapp/webhook - Incoming WhatsApp Events
 */
export const handleWebhook = async (req, res) => {
  try {
    // Acknowledge Meta immediately to prevent retry floods
    res.status(200).send("EVENT_RECEIVED");

    const body = req.body;
    if (!body || body.object !== "whatsapp_business_account") return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return;

    const message = messages[0];
    const userPhone = message.from;
    const messageId = message.id;
    const messageType = message.type;

    // Deduplication check
    const existingMessage = await WhatsAppMessage.findOne({ whatsapp_message_id: messageId });
    if (existingMessage) return;

    // Inbound text / button parsing
    let inboundText = "";
    let interactiveId = null;

    if (messageType === "text") {
      inboundText = message.text?.body || "";
    } else if (messageType === "interactive") {
      const interactive = message.interactive;
      if (interactive.type === "button_reply") {
        interactiveId = interactive.button_reply.id;
        inboundText = interactive.button_reply.title;
      } else if (interactive.type === "list_reply") {
        interactiveId = interactive.list_reply.id;
        inboundText = interactive.list_reply.title;
      }
    } else {
      inboundText = `[Received ${messageType} message]`;
    }

    // Find or create lead
    let lead = await WhatsAppLead.findOne({ whatsapp_number: userPhone });
    if (!lead) {
      const contactInfo = value?.contacts?.[0]?.profile?.name || "WhatsApp Visitor";
      lead = await WhatsAppLead.create({
        whatsapp_number: userPhone,
        phone: userPhone,
        name: contactInfo,
        status: "new",
        current_step: "START",
        source: "website_whatsapp",
        notes: inboundText && !interactiveId ? inboundText : ""
      });
    } else if (!lead.notes && inboundText && !interactiveId && !inboundText.startsWith("[")) {
      lead.notes = inboundText;
      await lead.save();
    }

    // Save inbound message log
    await WhatsAppMessage.create({
      lead_id: lead._id,
      whatsapp_number: userPhone,
      whatsapp_message_id: messageId,
      direction: "INBOUND",
      message_type: messageType,
      message_text: inboundText,
      interactive_reply_id: interactiveId,
      raw_payload: body
    });

    // Run Chatbot State Machine
    const botResult = await processConversation({
      lead,
      text: inboundText,
      phone: userPhone,
      interactiveId
    });

    // Save outbound message log
    if (botResult && botResult.reply) {
      await WhatsAppMessage.create({
        lead_id: lead._id,
        whatsapp_number: userPhone,
        direction: "OUTBOUND",
        message_type: "text",
        message_text: botResult.reply
      });
    }

    lead.last_message_at = new Date();
    await lead.save();
  } catch (error) {
    console.error("Error processing WhatsApp webhook:", error);
  }
};

/**
 * 3. GET /api/whatsapp/leads - Admin API to get all leads
 */
export const getWhatsAppLeads = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { whatsapp_number: { $regex: search, $options: "i" } },
        { service_interest: { $regex: search, $options: "i" } },
        { course: { $regex: search, $options: "i" } }
      ];
    }

    const total = await WhatsAppLead.countDocuments(query);
    const leads = await WhatsAppLead.find(query)
      .sort({ last_message_at: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.status(200).json({ success: true, data: leads, total });
  } catch (error) {
    console.error("Failed to fetch WhatsApp leads:", error);
    return res.status(500).json({ error: "Failed to fetch leads." });
  }
};

/**
 * 4. GET /api/whatsapp/leads/:id - Admin API to get lead chat history
 */
export const getWhatsAppLeadDetails = async (req, res) => {
  try {
    const lead = await WhatsAppLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const messages = await WhatsAppMessage.find({ lead_id: req.params.id }).sort({ createdAt: 1 });
    return res.status(200).json({ success: true, lead, messages });
  } catch (error) {
    console.error("Failed to fetch WhatsApp lead details:", error);
    return res.status(500).json({ error: "Failed to fetch details." });
  }
};

/**
 * 5. PATCH /api/whatsapp/leads/:id/status - Update lead status
 */
export const updateWhatsAppLeadStatus = async (req, res) => {
  try {
    const lead = await WhatsAppLead.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    return res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error("Failed to update WhatsApp lead status:", error);
    return res.status(500).json({ error: "Failed to update lead." });
  }
};

/**
 * 6. POST /api/whatsapp/leads/:id/reply - Send Manual WhatsApp Reply from Admin Panel
 */
export const sendManualWhatsAppMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message content cannot be empty." });
    }

    const lead = await WhatsAppLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    // Send through Meta Graph API
    await sendWhatsAppText(lead.whatsapp_number, message);

    // Save outbound log
    await WhatsAppMessage.create({
      lead_id: lead._id,
      whatsapp_number: lead.whatsapp_number,
      direction: "OUTBOUND",
      message_type: "text",
      message_text: message
    });

    lead.last_message_at = new Date();
    await lead.save();

    return res.status(200).json({ success: true, message: "Sent successfully." });
  } catch (error) {
    console.error("Failed to send manual WhatsApp message:", error);
    return res.status(500).json({ error: "Failed to send message." });
  }
};

/**
 * 7. ALL /api/whatsapp/data-deletion - Meta Compliance Callback
 */
export const handleDataDeletion = async (req, res) => {
  const confirmationCode = `del_${Date.now()}`;
  return res.status(200).json({
    url: "https://shikshadesign.com/privacy-policy",
    confirmation_code: confirmationCode
  });
};
