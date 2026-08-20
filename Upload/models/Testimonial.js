import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema(
     {
          name: { type: String, required: true },
          quote: { type: String, required: true },
          role: { type: String, default: "Student" }
     },
     { timestamps: true }
);

export default mongoose.model("Testimonial", testimonialSchema);
