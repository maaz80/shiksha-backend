import mongoose from "mongoose";

const faqSchema = new mongoose.Schema({
     pageSlug: {
          type: String,
          required: true,
          unique: true
     },
     title: {
          type: String,
          default: "FAQ"
     },
     faq: [
          {
               ques: String,
               ans: String,
          }
     ]
}, { timestamps: true });

const Faq = mongoose.model("FAQ", faqSchema);
export default Faq;