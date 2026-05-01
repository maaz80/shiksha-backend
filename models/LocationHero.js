// models/LocationHero.js
import mongoose from "mongoose";

const locationHeroSchema = new mongoose.Schema(
     {
          title: {
               type: String,
               required: true,
               trim: true,
          },
          description: {
               type: String,
               required: true,
               trim: true,
          },
          points: [
               {
                    type: String,
                    trim: true,
               },
          ],
     },
     { timestamps: true }
);

const LocationHero = mongoose.model("LocationHero", locationHeroSchema);

export default LocationHero;