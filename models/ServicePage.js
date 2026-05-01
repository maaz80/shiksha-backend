// models/ServicePage.js
import mongoose from "mongoose";

const servicePageSchema = new mongoose.Schema(
     {
          help: {
               title: String,
               description: String,
               cards: [
                    {
                         head: String,
                         subhead: String,
                         para: String
                    }
               ]
          },

          service: {
               title: String,
               description: String,
               cards: [
                    {
                         image: String,
                         para: String
                    }
               ]
          },

          why: {
               title: String,
               content: String // HTML from editor
          }
     },
     { timestamps: true }
);

const ServicePage = mongoose.model("ServicePage", servicePageSchema);

export default ServicePage;