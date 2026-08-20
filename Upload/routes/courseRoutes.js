import express from 'express'
const router = express.Router();
import {
     getCourses,
     getCourse,
     updateCourse,
     deleteCourse,
     createCourse,
     uploadCourseVideo,
     getCoursePageData,
     updateCoursePageData,
     updateGlobalCourseConfig
} from "../controllers/courseController.js";

import upload from "../middleware/multer.js";

router.get("/coursepage-data", getCoursePageData);
router.put("/coursepage-data", updateCoursePageData);

router.post("/courses", upload.any(), createCourse);
router.put("/courses", upload.any(), updateGlobalCourseConfig);
router.post("/courses/video", upload.single("video"), uploadCourseVideo);
router.get("/courses", getCourses);
router.get("/courses/:slug", getCourse);
router.put("/courses/:id", upload.any(), updateCourse);
router.delete("/courses/:id", deleteCourse);

export default router;

