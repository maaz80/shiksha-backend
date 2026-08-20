import express from "express";
import { getFaq, updateFaq } from "../controllers/faqController.js";

const router = express.Router();

router.get("/pages/:pageId/faq", getFaq);
router.put("/pages/:pageId/faq", updateFaq);

export default router;