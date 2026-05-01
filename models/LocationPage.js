// models/LocationPage.js
import mongoose from "mongoose";

const locationPageSchema = new mongoose.Schema(
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

const LocationPage = mongoose.model("LocationPage", locationPageSchema);

export default LocationPage;