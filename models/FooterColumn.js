import mongoose from "mongoose";

const footerColumnSchema = new mongoose.Schema({
     title: {
          type: String,
          required: true
     },
     links: [{
          label: {
               type: String,
               required: true
          },
          path: {
               type: String,
               required: true
          }
     }],
     order: {
          type: Number,
          default: 0
     }
}, { timestamps: true });

const FooterColumn = mongoose.model("FooterColumn", footerColumnSchema);

export default FooterColumn;
