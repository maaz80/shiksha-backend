import About from "../models/About.js";

// Get About Data
export const getAboutData = async (req, res) => {
     try {
          const aboutData = await About.findOne();
          if (!aboutData) {
               return res.json({
                    hero: { startTitle: "", midTitle: "", endTitle: "", description: "", image: "" },
                    shikshadetails: [],
                    ourvalues: { title: "", values: [] },
                    team: { title: "", members: [] }
               });
          }
          res.json(aboutData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// Create or Update About Data
export const updateAboutData = async (req, res) => {
     try {
          const aboutData = await About.findOneAndUpdate({}, req.body, {
               upsert: true,
               new: true,
               setDefaultsOnInsert: true
          });
          res.json(aboutData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};
