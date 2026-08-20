import express from "express";
import { getAboutData, updateAboutData } from "../controllers/aboutController.js";

const router = express.Router();

router.get("/about-data", getAboutData);
router.put("/about-data", updateAboutData);

export default router;
