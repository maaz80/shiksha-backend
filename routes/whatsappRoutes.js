import express from "express";
import {
  verifyWebhook,
  handleWebhook,
  getWhatsAppLeads,
  getWhatsAppLeadDetails,
  updateWhatsAppLeadStatus,
  sendManualWhatsAppMessage,
  handleDataDeletion
} from "../controllers/whatsappController.js";

const router = express.Router();

// Public Meta Webhook & Compliance Endpoints
router.get("/whatsapp/webhook", verifyWebhook);
router.post("/whatsapp/webhook", handleWebhook);
router.all("/whatsapp/data-deletion", handleDataDeletion);

// Admin Lead Management & Two-Way Live Chat APIs
router.get("/whatsapp/leads", getWhatsAppLeads);
router.get("/whatsapp/leads/:id", getWhatsAppLeadDetails);
router.patch("/whatsapp/leads/:id/status", updateWhatsAppLeadStatus);
router.post("/whatsapp/leads/:id/reply", sendManualWhatsAppMessage);

export default router;
