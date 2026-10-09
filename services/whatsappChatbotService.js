import {
  sendWhatsAppText,
  sendWhatsAppInteractiveButtons,
  sendWhatsAppInteractiveList
} from "./whatsappService.js";
import { ingestUnifiedLead } from "./leadService.js";

/**
 * Main State Machine Handler for incoming WhatsApp messages
 * Tailored for Shiksha Learning Platform & Design Academy
 */
export async function processConversation({ lead, text, phone, interactiveId }) {
  const normalizedText = (text || "").toLowerCase().trim();
  const actionId = interactiveId || normalizedText;

  // 1. GLOBAL KEYWORDS & RESTART HANDLERS
  if (
    ["hi", "hello", "hey", "start", "menu", "restart", "btn_start_menu"].includes(normalizedText) ||
    actionId === "btn_start_menu"
  ) {
    lead.current_step = "START";
    await lead.save();
    return sendMainMenu(phone);
  }

  // 2. COUNSELOR & HUMAN HANDOVER HANDLER
  if (
    normalizedText.includes("human") ||
    normalizedText.includes("agent") ||
    normalizedText.includes("counselor") ||
    normalizedText.includes("advisor") ||
    normalizedText.includes("talk") ||
    normalizedText.includes("call") ||
    normalizedText.includes("callback") ||
    actionId === "btn_talk_human"
  ) {
    lead.status = "human_handover";
    lead.current_step = "HUMAN_HANDOVER";
    await lead.save();

    // Auto sync to Shiksha CRM as Hot Lead
    try {
      await ingestUnifiedLead({
        name: lead.name || "WhatsApp Guest",
        phone: lead.whatsapp_number,
        course: lead.service_interest || lead.course || "General Inquiry",
        source: "WhatsApp Counselor Request",
        answers: {
          experience: lead.experience_or_budget,
          preferred_time: lead.preferred_contact_time,
          status: "Counselor Requested"
        },
        answersSummary: `Counselor Requested via WhatsApp | Course: ${lead.service_interest} | Phone: +${lead.whatsapp_number}`
      });
    } catch (crmErr) {
      console.warn("Notice: Lead CRM sync skipped:", crmErr.message);
    }

    const replyText =
      "Sure! An expert Shiksha Academic Counselor will connect with you on this WhatsApp number shortly.\n\n" +
      "📞 You can also reach our student admissions helpline directly at +91 9311500424.";
    await sendWhatsAppText(phone, replyText);
    return { reply: replyText, currentStep: "HUMAN_HANDOVER" };
  }

  // 3. STEP-BY-STEP CONVERSATION FLOW
  const currentStep = lead.current_step || "START";

  switch (currentStep) {
    case "START":
    default: {
      if (
        actionId === "btn_explore_courses" ||
        actionId === "btn_explore_services" ||
        normalizedText.includes("course") ||
        normalizedText.includes("learn") ||
        normalizedText.includes("study") ||
        normalizedText.includes("syllabus") ||
        normalizedText.includes("fee")
      ) {
        lead.current_step = "ASK_SERVICE";
        await lead.save();
        return sendServicesList(phone);
      }
      return sendMainMenu(phone);
    }

    case "ASK_SERVICE": {
      let selectedService = "";

      if (actionId === "crs_uiux") selectedService = "UI/UX & Product Design";
      else if (actionId === "crs_fullstack") selectedService = "Full Stack Web Development";
      else if (actionId === "crs_graphic") selectedService = "Graphic Design & Branding";
      else if (actionId === "crs_mentorship") selectedService = "1-on-1 Mentorship & Career";
      else if (text) {
        selectedService = text.trim();
      }

      if (!selectedService) selectedService = "UI/UX & Product Design";

      lead.service_interest = selectedService;
      lead.course = selectedService;
      lead.current_step = "ASK_GOAL";
      lead.status = "in_progress";
      await lead.save();

      return sendGoalButtons(phone, selectedService);
    }

    case "ASK_GOAL": {
      let selectedGoal = "Complete Beginner";
      if (actionId.startsWith("exp_")) {
        if (actionId.includes("beginner")) selectedGoal = "Complete Beginner";
        else if (actionId.includes("switch")) selectedGoal = "Career Switcher";
        else if (actionId.includes("fresher")) selectedGoal = "College Student / Fresher";
      } else if (text) {
        selectedGoal = text.trim();
      }

      lead.experience_or_budget = selectedGoal;
      lead.current_step = "ASK_SCHEDULE";
      await lead.save();

      return sendScheduleButtons(phone);
    }

    case "ASK_SCHEDULE": {
      let selectedSchedule = "Weekend Live Batches";
      if (actionId.startsWith("sch_")) {
        if (actionId.includes("weekend")) selectedSchedule = "Weekend Live Batches";
        else if (actionId.includes("weekday")) selectedSchedule = "Weekday Evening Batches";
        else if (actionId.includes("flexible")) selectedSchedule = "1-on-1 Flexible Mentorship";
      } else if (text) {
        selectedSchedule = text.trim();
      }

      lead.preferred_contact_time = selectedSchedule;
      lead.current_step = "ASK_NAME";
      await lead.save();

      const replyText = "May I please know your *Full Name* so we can register your inquiry with Shiksha Admissions?";
      await sendWhatsAppText(phone, replyText);
      return { reply: replyText, currentStep: "ASK_NAME" };
    }

    case "ASK_NAME": {
      const userName = text ? text.trim() : "Future Student";
      lead.name = userName;
      lead.current_step = "QUALIFIED";
      lead.status = "qualified";
      await lead.save();

      // Automatically sync qualified lead into Shiksha CRM
      try {
        await ingestUnifiedLead({
          name: lead.name,
          phone: lead.whatsapp_number,
          course: lead.service_interest || lead.course,
          source: "WhatsApp Chatbot",
          answers: {
            course: lead.service_interest,
            experience: lead.experience_or_budget,
            batch: lead.preferred_contact_time
          },
          answersSummary: `WhatsApp Inquiry | Course: ${lead.service_interest} | Background: ${lead.experience_or_budget} | Batch: ${lead.preferred_contact_time}`
        });
      } catch (crmErr) {
        console.warn("Notice: Lead CRM sync skipped:", crmErr.message);
      }

      const summaryText =
        `Thank you ${lead.name}! 🎓 Your inquiry has been registered.\n\n` +
        `• *Course*: ${lead.service_interest}\n` +
        `• *Background*: ${lead.experience_or_budget}\n` +
        `• *Preferred Batch*: ${lead.preferred_contact_time}\n\n` +
        `Our admissions team will share the complete syllabus, project portfolio breakdown, and scholarship details shortly!`;

      await sendWhatsAppInteractiveButtons(
        phone,
        summaryText,
        [
          { id: "btn_start_menu", title: "Main Menu" },
          { id: "btn_talk_human", title: "Talk to Counselor" }
        ],
        "Admission Inquired"
      );

      return { reply: summaryText, currentStep: "QUALIFIED" };
    }

    case "QUALIFIED": {
      const replyText = `Hi ${lead.name}! We have your inquiry for *${lead.service_interest}* logged. How else can we assist you right now?`;
      await sendWhatsAppInteractiveButtons(
        phone,
        replyText,
        [
          { id: "btn_explore_courses", title: "Explore Courses" },
          { id: "btn_talk_human", title: "Talk to Counselor" }
        ],
        "Shiksha Support"
      );
      return { reply: replyText, currentStep: "QUALIFIED" };
    }
  }
}

// -------------------------------------------------------------
// HELPER FUNCTIONS FOR INTERACTIVE MESSAGES
// -------------------------------------------------------------

async function sendMainMenu(phone) {
  const bodyText =
    "👋 Welcome to Shiksha!\n\n" +
    "India's premier academy for UI/UX Design, Web Development & in-demand tech skills.\n\n" +
    "How can we help guide your learning journey today?";

  const buttons = [
    { id: "btn_explore_courses", title: "Explore Courses" },
    { id: "btn_talk_human", title: "Talk to Counselor" }
  ];
  await sendWhatsAppInteractiveButtons(phone, bodyText, buttons, "Shiksha Academy");
  return { reply: bodyText, currentStep: "START" };
}

async function sendServicesList(phone) {
  const bodyText = "Please select the certified program you are interested in:";
  const sections = [
    {
      title: "Our Certified Cohorts",
      rows: [
        { id: "crs_uiux", title: "UI/UX & Product Design", description: "Figma, Design Systems, UX Research & Apps" },
        { id: "crs_fullstack", title: "Full Stack Web Dev", description: "React, Next.js, Node.js & MERN Stack" },
        { id: "crs_graphic", title: "Graphic & Brand Design", description: "Visual Identity, Adobe Suite & Socials" },
        { id: "crs_mentorship", title: "1-on-1 Career Mentorship", description: "Portfolio Reviews & Mock Interviews" }
      ]
    }
  ];
  await sendWhatsAppInteractiveList(phone, bodyText, "Select Course", sections, "Programs Catalog");
  return { reply: bodyText, currentStep: "ASK_SERVICE" };
}

async function sendGoalButtons(phone, serviceName) {
  const bodyText = `Great! What is your current learning background for *${serviceName}*?`;
  const buttons = [
    { id: "exp_beginner", title: "Complete Beginner" },
    { id: "exp_switch", title: "Career Switcher" },
    { id: "exp_fresher", title: "College Student" }
  ];
  await sendWhatsAppInteractiveButtons(phone, bodyText, buttons, "Your Background");
  return { reply: bodyText, currentStep: "ASK_GOAL" };
}

async function sendScheduleButtons(phone) {
  const bodyText = "Which batch schedule works best for your routine?";
  const buttons = [
    { id: "sch_weekend", title: "Weekend Batches" },
    { id: "sch_weekday", title: "Weekday Evening" },
    { id: "sch_flexible", title: "1-on-1 Flexible" }
  ];
  await sendWhatsAppInteractiveButtons(phone, bodyText, buttons, "Batch Timings");
  return { reply: bodyText, currentStep: "ASK_SCHEDULE" };
}
