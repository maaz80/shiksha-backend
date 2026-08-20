import express from "express";
import { getPageSEO, updatePageSEO } from "../controllers/pageSEOController.js";

const router = express.Router();

router.get("/pages/:pageId/seo", getPageSEO);
router.put("/pages/:pageId/seo", updatePageSEO);

export default router;