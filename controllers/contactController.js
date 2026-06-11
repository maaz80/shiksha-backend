import Contact from "../models/Contact.js";

// Get Contact Data
export const getContactData = async (req, res) => {
     try {
          const contactData = await Contact.findOne();
          if (!contactData) {
               return res.json({
                    hero: { 
                         title: "Contact Shiksha", 
                         description: "Shiksha is the world’s #1 online bootcamp and one of the world’s leading certification training providers. We partner with companies and individuals to address their unique needs, providing training and coaching that helps working professionals achieve their career goals" 
                    },
                    card: { 
                         companyname: "Company Registered Name", 
                         address: "NALANDA 53/1 C, Manoj Arcade, 24th Main Rd, Sector 2, HSR Layout, Bengaluru - 560102, Karnataka, India.", 
                         email: "companyname@domain.com", 
                         phone: "+91 99999 99999", 
                         image: "", 
                         link: "",
                         buttonname: "Get Directions"
                    },
                    enquiry: { 
                         title: "Enquiries", 
                         values: [] 
                    }
               });
          }
          res.json(contactData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// Create or Update Contact Data
export const updateContactData = async (req, res) => {
     try {
          const contactData = await Contact.findOneAndUpdate({}, req.body, {
               upsert: true,
               new: true,
               setDefaultsOnInsert: true
          });
          res.json(contactData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};
