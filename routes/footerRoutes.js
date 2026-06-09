import express from "express";
import {
     getFooterColumns,
     createFooterColumn,
     updateFooterColumn,
     deleteFooterColumn
} from "../controllers/footerController.js";

const router = express.Router();

router.get("/footer-columns", getFooterColumns);
router.post("/footer-columns", createFooterColumn);
router.put("/footer-columns/:id", updateFooterColumn);
router.delete("/footer-columns/:id", deleteFooterColumn);

export default router;
