import mongoose from "mongoose";

const whatsAppLeadSchema = new mongoose.Schema(
  {
    whatsapp_number: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      default: "WhatsApp Guest",
      trim: true
    },
    service_interest: {
      type: String,
      default: "General Inquiry",
      trim: true
    },
    course: {
      type: String,
      default: "General Inquiry",
      trim: true
    },
    experience_or_budget: {
      type: String,
      default: "Not Specified",
      trim: true
    },
    project_goal: {
      type: String,
      default: "Not Specified",
      trim: true
    },
    preferred_contact_time: {
      type: String,
      default: "Anytime",
      trim: true
    },
    current_step: {
      type: String,
      default: "START",
      index: true
    },
    status: {
      type: String,
      enum: [
        "new",
        "in_progress",
        "qualified",
        "demo_requested",
        "human_handover",
        "converted",
        "closed",
        "Pending"
      ],
      default: "new",
      index: true
    },
    source: {
      type: String,
      default: "website_whatsapp",
      trim: true
    },
    notes: {
      type: String,
      default: ""
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    last_message_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure phone & course fields stay populated for cross-module compatibility
whatsAppLeadSchema.pre("save", function () {
  if (this.whatsapp_number && !this.phone) {
    this.phone = this.whatsapp_number;
  }
  if (this.service_interest && (!this.course || this.course === "General Inquiry")) {
    this.course = this.service_interest;
  }
});

export default mongoose.models.WhatsAppLead || mongoose.model("WhatsAppLead", whatsAppLeadSchema);
