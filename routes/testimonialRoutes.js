import express from "express";
import {
     getTestimonials,
     createTestimonial,
     updateTestimonial,
     deleteTestimonial
} from "../controllers/testimonialController.js";

const router = express.Router();

router.get("/testimonials", getTestimonials);
router.post("/testimonials", createTestimonial);
router.put("/testimonials/:id", updateTestimonial);
router.delete("/testimonials/:id", deleteTestimonial);

export default router;
