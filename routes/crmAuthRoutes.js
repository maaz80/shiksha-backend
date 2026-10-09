import express from "express";
import { loginCrm, verifySession } from "../controllers/crmAuthController.js";

const router = express.Router();

router.post("/login", loginCrm);
router.get("/verify", verifySession);

export default router;
