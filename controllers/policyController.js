import Policy from "../models/Policy.js";

// Get Policy Data
export const getPolicyData = async (req, res) => {
     try {
          const policyData = await Policy.findOne();
          if (!policyData) {
               return res.json({
                    disclaimer: { title: "Disclaimer", content: "" },
                    privacyPolicy: { title: "Privacy Policy", content: "" }
               });
          }
          res.json(policyData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// Create or Update Policy Data
export const updatePolicyData = async (req, res) => {
     try {
          const policyData = await Policy.findOneAndUpdate({}, req.body, {
               upsert: true,
               new: true,
               setDefaultsOnInsert: true
          });
          res.json(policyData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};
