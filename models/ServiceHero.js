// models/ServiceHero.js
import mongoose from "mongoose";

const serviceHeroSchema = new mongoose.Schema(
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

const ServiceHero = mongoose.model("ServiceHero", serviceHeroSchema);

export default ServiceHero;