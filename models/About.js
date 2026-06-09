import mongoose from "mongoose";

const aboutSchema = new mongoose.Schema({
     hero: {
          startTitle: String,
          midTitle: String,
          endTitle: String,
          description: String,
     },
     shikshadetails: [
          {
               title: String,
               description: String,

          }
     ],
     ourvalues: [
          {
               title: String,
               description: String,

          }
     ],
    
}, { _id: false });


export default mongoose.model("About", aboutSchema);
