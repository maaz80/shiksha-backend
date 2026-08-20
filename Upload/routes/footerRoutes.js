import express from "express";
import {
     getFooterColumns,
     createFooterColumn,
     updateFooterColumn,
     deleteFooterColumn,
     getFooterGlobalSettings,
     updateFooterGlobalSettings
} from "../controllers/footerController.js";

const router = express.Router();

router.get("/footer-columns", getFooterColumns);
router.get("/footer-columns/global", getFooterGlobalSettings);
router.put("/footer-columns/global", updateFooterGlobalSettings);
router.post("/footer-columns", createFooterColumn);
router.put("/footer-columns/:id", updateFooterColumn);
router.delete("/footer-columns/:id", deleteFooterColumn);

export default router;
