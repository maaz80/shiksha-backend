import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
     startTitle: {
          type: String
     },

     endTitle: {
          type: String
     },

     description: {
          type: String
     },

     images: [
          {
               title: {
                    type: String,
                    required: true
               },
               image: {
                    type: String,
                    required: true
               }
          }
     ]
}, { timestamps: true });

export default mongoose.model("Image", imageSchema);