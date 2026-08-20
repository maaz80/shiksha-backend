import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
     hero: {
          title: String,
          description: String,
     },
     card: 
          {
               companyname: String,
               address: String,
               email: String,
               phone: String,
               image: String,
               link: String,
               buttonname: String,
          }
     ,
     enquiry: {
          title: String,
          values: [
               {
                    cardtitle: String,
                    buttonname: String,
                    image: String,
                    butttonlink: String,
               }
          ]
     },
   
}, { _id: false });


export default mongoose.model("Contact", contactSchema);
