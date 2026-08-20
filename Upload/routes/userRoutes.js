import express from "express";
import { signup, login, getMe, logout, forgotPassword, resetPassword, sendOTP, loginWithOTP, signupWithOTP } from "../controllers/authController.js";
import { enrollCourse, completeLessonAndUnlockNext, getCourseEnrollment } from "../controllers/enrollmentController.js";
import { userAuth } from "../middleware/userAuth.js";

const router = express.Router();

// Auth routes (public)
router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password", resetPassword);
router.post("/auth/send-otp", sendOTP);
router.post("/auth/login-otp", loginWithOTP);
router.post("/auth/signup-otp", signupWithOTP);

// Auth routes (protected)
router.get("/auth/me", userAuth, getMe);
router.post("/auth/logout", userAuth, logout);

// Enrollment routes (protected)
router.post("/enroll", userAuth, enrollCourse);
router.post("/complete-lesson", userAuth, completeLessonAndUnlockNext);
router.get("/enrollment/:courseId", userAuth, getCourseEnrollment);

export default router;
