import express from 'express'
const router = express.Router();
import {
     getCourses,
     getCourse,
     updateCourse,
     deleteCourse,
     createCourse,
     uploadCourseVideo,
     addCourseReview,
     deleteCourseReview,
     getAllReviews,
     getCoursePageData,
     updateCoursePageData
} from "../controllers/courseController.js";

import upload from "../middleware/multer.js";

router.get("/coursepage-data", getCoursePageData);
router.put("/coursepage-data", updateCoursePageData);

router.post("/courses", upload.single("image"), createCourse);
router.post("/courses/video", upload.single("video"), uploadCourseVideo);
router.get("/courses", getCourses);
router.get("/reviews/all", getAllReviews);
router.get("/courses/:slug", getCourse);
router.put("/courses/:id", upload.single("image"), updateCourse);
router.delete("/courses/:id", deleteCourse);

// Review routes
router.post("/courses/:id/reviews", upload.single("image"), addCourseReview);
router.delete("/courses/:id/reviews/:reviewId", deleteCourseReview);

export default router;
