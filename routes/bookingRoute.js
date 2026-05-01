import express from "express";
import { sendOTP, verifyOTPAndSubmit } from "../controllers/otpController.js";
import { otpRateLimit } from "../middleware/otpRateLimit.js";

const router = express.Router();

router.post("/send-otp", otpRateLimit, sendOTP);
router.post("/submit-booking", verifyOTPAndSubmit);

export default router;
