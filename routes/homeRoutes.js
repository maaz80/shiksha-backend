import express from "express";
import { getHomeData, updateHomeData } from "../controllers/homeController.js";

const router = express.Router();

router.get("/home-data", getHomeData);
router.put("/home-data", updateHomeData);

export default router;
