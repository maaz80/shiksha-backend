import mongoose from "mongoose";

const footerColumnSchema = new mongoose.Schema({
     title: {
          type: String,
          required: false
     },
     links: [{
          label: {
               type: String,
          },
          path: {
               type: String,
          }
     }],
     order: {
          type: Number,
          default: 0
     },
     navigation: [{
          itemname: {
               type: String
          },
          itempath: {
               type: String
          }
     }],
     socials: [{
          icon: {
               type: String
          },
          path: {
               type: String
          }
     }],
     buttonname: {
          type: String
     },
     buttontitle: {
          type: String
     },
     copyright: {
          type: String
     },
     isGlobal: {
          type: Boolean,
          default: false
     }
}, { timestamps: true });

const FooterColumn = mongoose.model("FooterColumn", footerColumnSchema);

export default FooterColumn;
