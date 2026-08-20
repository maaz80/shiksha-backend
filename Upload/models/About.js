import mongoose from "mongoose";

const aboutSchema = new mongoose.Schema({
     hero: {
          startTitle: String,
          midTitle: String,
          endTitle: String,
          description: String,
          image: String,
     },
     shikshadetails: [
          {
               title: String,
               description: String,
          }
     ],
     ourvalues: {
          title: String,
          values: [
               {
                    title: String,
                    description: String,
                    image: String,
               }
          ]
     },
     team: {
          title: String,
          members: [
               {
                    title: String,
                    description: String,
                    image: String,
               }
          ]
     }
}, { _id: false });


export default mongoose.model("About", aboutSchema);
