import express from "express";
import { submitLead } from "../controllers/leadController.js";

const router = express.Router();

router.post("/leads", submitLead);

export default router;
