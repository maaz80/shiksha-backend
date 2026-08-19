import mongoose from "mongoose";

const policySchema = new mongoose.Schema({
     disclaimer: {
          title: { type: String, default: "Disclaimer" },
          content: { type: String, default: "" },
     },
     privacyPolicy: {
          title: { type: String, default: "Privacy Policy" },
          content: { type: String, default: "" },
     },
     termsAndConditionsEnrolment: {
          title: { type: String, default: "Terms & Conditions - Enrolment" },
          content: { type: String, default: "" },
     }
});

export default mongoose.model("Policy", policySchema);
