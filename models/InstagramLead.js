import mongoose from "mongoose";

const instagramLeadSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Instagram Visitor", trim: true },
    instagramUsername: { type: String, default: "", trim: true, index: true },
    instagramScopedId: { type: String, default: "", trim: true, index: true },
    phone: { type: String, default: "", trim: true },
    course: { type: String, default: "General Inquiry", trim: true },
    message: { type: String, default: "" },
    status: { type: String, default: "Pending" },
    source: { type: String, default: "Instagram DM" }
  },
  { timestamps: true }
);

export default mongoose.models.InstagramLead || mongoose.model("InstagramLead", instagramLeadSchema);
