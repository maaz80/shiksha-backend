import express from "express";
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  updateLeadStatus,
  addLeadNote,
  scheduleFollowup,
  deleteLead,
  syncExistingLeads,
  getAnalytics,
  getPermissions,
  updatePermissions
} from "../controllers/crmLeadController.js";
import { verifyCrmAuth, requireCrmAdmin } from "../controllers/crmAuthController.js";

const router = express.Router();

// Public health check or verify middleware
router.use(verifyCrmAuth);

// Analytics & Sync
router.get("/analytics", getAnalytics);
router.post("/sync", syncExistingLeads);

// Permissions
router.get("/permissions", getPermissions);
router.put("/permissions", requireCrmAdmin, updatePermissions);

// Leads CRUD
router.get("/", getLeads);
router.post("/", createLead);
router.get("/:id", getLeadById);
router.put("/:id", updateLead);
router.patch("/:id/status", updateLeadStatus);
router.post("/:id/notes", addLeadNote);
router.post("/:id/followup", scheduleFollowup);
router.delete("/:id", deleteLead);

export default router;
