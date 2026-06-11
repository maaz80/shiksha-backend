import mongoose from "mongoose";

const homeSchema = new mongoose.Schema({
     hero: {
          startTitle: String,
          midTitle: String,
          endTitle: String,
          buttonText: String,
          ratingImages: [String],
          ratingText: String,
     },
     whatwedo: {
          point: [
               {
                    image: String,
                    text: String,
               }
          ],
     },
     ourprograms: {
          startTitle: String,
          endTitle: String,
     },
     howitworks: {
          title: String,
          works: [
               {
                    title: String,
                    description: String,

               }
          ]
     },
     community: {
          startTitle: String,
          midTitle: String,
          endTitle: String,
          description: String,
          points: [
               {
                    title: String,
                    description: String,
               }
          ]
     },
     communityBar: [{
          title: String,
          description: String,
          image: String,
     }],
     testimonialstitle:{
          startTitle: String,
          midTitle: String,
          endTitle: String,
          description: String,
     },
     relatedblogstitle:String,
}, { _id: false });


export default mongoose.model("Home", homeSchema);
