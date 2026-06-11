import Image from "../models/Image.js";

// Get Images Config
export const getImages = async (req, res) => {
     try {
          let config = await Image.findOne();
          if (!config) {
               config = await Image.create({
                    startTitle: "Companies",
                    endTitle: "That Our Students Work At",
                    description: "Our students have gone on to build successful careers with leading organizations across diverse industries, showcasing the skills, knowledge, and confidence they gained through our programs.",
                    images: []
               });
          }
          res.json(config);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// Update Images Config
export const updateImagesConfig = async (req, res) => {
     try {
          const config = await Image.findOneAndUpdate(
               {},
               req.body,
               { new: true, upsert: true, setDefaultsOnInsert: true }
          );
          res.json(config);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};