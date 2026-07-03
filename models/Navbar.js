import mongoose from "mongoose";

const navbarSchema = new mongoose.Schema({
     logo: String,
     buttonName: String,
     searchPlaceholder: String,
     dropdownName: String,
     dropdownItems: [{
          name: String,
          link: String,
     }],
     logoutButtonName: String,
     moreItems: {
          title: String,
          dropdown_items: [{
               title: String,
               items: [{
                    name: String,
                    link: String
               }]
          }]
     }
}, { _id: false });


export default mongoose.model("Navbar", navbarSchema);
