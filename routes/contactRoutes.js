import express from "express";
import { getContactData, updateContactData } from "../controllers/contactController.js";

const router = express.Router();

router.get("/contact-data", getContactData);
router.put("/contact-data", updateContactData);

export default router;
