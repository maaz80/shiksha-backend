import mongoose from "mongoose";

const pageSEOSchema = new mongoose.Schema({
     pageSlug: {
          type: String,
          required: true,
          unique: true
     },
     title: {
          type: String,
          trim: true
     },
     description: {
          type: String,
          trim: true
     },
     keywords: {
          type: String,
          trim: true
     },
     schema: {
          type: String,
          trim: true,
          default: ""
     }
}, { timestamps: true });

const PageSEO = mongoose.model("PageSEO", pageSEOSchema);
export default PageSEO;