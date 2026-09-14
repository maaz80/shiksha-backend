import express from "express";
import { loginAdmin, assignCourseToUser, revokeCourseFromUser, getAllUsers } from "../controllers/adminController.js";
import { sendCourseMeetLink, clearCourseLiveClass, createZoomMeetingApi, syncZoomRecordings } from "../controllers/meetController.js";

const router = express.Router();

router.post("/admin/login", loginAdmin);

// User access & unlock endpoints for Admin
router.get("/admin/users", getAllUsers);
router.get("/users-list", getAllUsers);

router.post("/assign-course", assignCourseToUser);
router.post("/admin/assign-course", assignCourseToUser);

router.post("/revoke-course", revokeCourseFromUser);
router.post("/admin/revoke-course", revokeCourseFromUser);

// Zoom Live Class Admin Routes
router.post("/admin/create-zoom-meeting", createZoomMeetingApi);
router.post("/admin/dispatch-live-meet", sendCourseMeetLink);
router.post("/admin/end-live-meet", clearCourseLiveClass);
router.post("/admin/sync-zoom-recordings", syncZoomRecordings);

router.post("/create-zoom-meeting", createZoomMeetingApi);
router.post("/dispatch-live-meet", sendCourseMeetLink);
router.post("/end-live-meet", clearCourseLiveClass);
router.post("/sync-zoom-recordings", syncZoomRecordings);

export default router;
