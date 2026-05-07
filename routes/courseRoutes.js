import express from 'express'
const router = express.Router();
import {
     getCourses,
     getCourse,
     updateCourse,
     deleteCourse,
     createCourse,
     uploadCourseVideo
} from "../controllers/courseController.js";

import upload from "../middleware/multer.js";

router.post("/courses", upload.single("image"), createCourse);
router.post("/courses/video", upload.single("video"), uploadCourseVideo);
router.get("/courses", getCourses);
router.get("/courses/:slug", getCourse);
router.put("/courses/:id", upload.single("image"), updateCourse);
router.delete("/courses/:id", deleteCourse);

export default router;
