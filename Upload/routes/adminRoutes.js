import express from "express";
import { loginAdmin, assignCourseToUser, revokeCourseFromUser, getAllUsers } from "../controllers/adminController.js";

const router = express.Router();

router.post("/admin/login", loginAdmin);

// User access & unlock endpoints for Admin
router.get("/admin/users", getAllUsers);
router.get("/users-list", getAllUsers);

router.post("/assign-course", assignCourseToUser);
router.post("/admin/assign-course", assignCourseToUser);

router.post("/revoke-course", revokeCourseFromUser);
router.post("/admin/revoke-course", revokeCourseFromUser);

export default router;
