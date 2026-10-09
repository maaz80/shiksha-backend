import express from "express";
import { loginErp, verifyErpSession, verifyErpAuth } from "../controllers/erpAuthController.js";
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  addStudentNote,
  unlockCourseForStudent,
  revokeCourseForStudent,
  importWonCrmLeads,
  getErpStats,
  getAcademyCourses
} from "../controllers/erpStudentController.js";
import {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch
} from "../controllers/erpBatchController.js";
import {
  saveAttendance,
  getAttendanceByDate,
  getAttendanceHistory
} from "../controllers/erpAttendanceController.js";
import { getPayments, recordPayment } from "../controllers/erpPaymentController.js";

const router = express.Router();

// 1. Public Auth Routes
router.post("/auth/login", loginErp);
router.get("/auth/verify", verifyErpSession);

// 2. Protected ERP Module Routes
router.use(verifyErpAuth);

// High-level Stats & Catalog
router.get("/stats", getErpStats);
router.get("/academy-courses", getAcademyCourses);
router.post("/crm-import", importWonCrmLeads);

// Student Management
router.get("/students", getStudents);
router.post("/students", createStudent);
router.get("/students/:id", getStudentById);
router.put("/students/:id", updateStudent);
router.delete("/students/:id", deleteStudent);
router.post("/students/:id/notes", addStudentNote);
router.post("/students/:id/unlock-course", unlockCourseForStudent);
router.post("/students/:id/revoke-course", revokeCourseForStudent);

// Batch Cohorts Management
router.get("/batches", getBatches);
router.post("/batches", createBatch);
router.get("/batches/:id", getBatchById);
router.put("/batches/:id", updateBatch);
router.delete("/batches/:id", deleteBatch);

// Financial Payments & Receipts
router.get("/payments", getPayments);
router.post("/payments", recordPayment);

// Daily Live Attendance Register
router.post("/attendance", saveAttendance);
router.get("/attendance/by-date", getAttendanceByDate);
router.get("/attendance/history", getAttendanceHistory);

export default router;
