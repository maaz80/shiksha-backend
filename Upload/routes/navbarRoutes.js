import express from "express";
import { getNavbarData, updateNavbarData } from "../controllers/navbarController.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.get("/navbar-data", getNavbarData);
router.put("/navbar-data", upload.single("logo"), updateNavbarData);

export default router;
