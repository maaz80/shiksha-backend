import mongoose from "mongoose";

const homeSchema = new mongoose.Schema({
     hero: {
          startTitle: String,
          midTitle: String,
          endTitle: String,
     },
     whatwedo: {
          firstPoint: String,
          secondPoint: String,
          thirdPoint: String,
     },
     howitworks: [
          {
               title: String,
               description: String,

          }
     ],
     community: [
          {
               title: String,
               description: String,
          }
     ],
     communityBar:[{
          title: String,
          description: String,
     }]
}, { _id: false });


export default mongoose.model("Home", homeSchema);
