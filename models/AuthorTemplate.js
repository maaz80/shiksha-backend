import mongoose from "mongoose";

const authorTemplateSchema = new mongoose.Schema({
     name: {
          type: String,
          required: true,
          trim: true
     },
     designation: {
          type: String,
          default: ""
     },
     image: {
          type: String,
          default: ""
     },
     bio: {
          type: String,
          default: ""
     },
     twitter: {
          type: String,
          default: ""
     }
}, { timestamps: true });

const AuthorTemplate = mongoose.model("AuthorTemplate", authorTemplateSchema);

export default AuthorTemplate;
