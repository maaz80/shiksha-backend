import Home from "../models/Home.js";

// Get Home Data
export const getHomeData = async (req, res) => {
     try {
          const homeData = await Home.findOne();
          if (!homeData) {
               return res.json({
                    hero: { startTitle: "", midTitle: "", endTitle: "" },
                    whatwedo: { firstPoint: "", secondPoint: "", thirdPoint: "" },
                    howitworks: [],
                    community: [],
                    communityBar: []
               });
          }
          res.json(homeData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// Create or Update Home Data
export const updateHomeData = async (req, res) => {
     try {
          const homeData = await Home.findOneAndUpdate({}, req.body, {
               upsert: true,
               returnDocument: 'after',
               setDefaultsOnInsert: true
          });
          res.json(homeData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};
