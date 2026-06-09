import Faq from "../models/Faq.js";
import mongoose from "mongoose";

// Get data for a specific page
export const getFaq = async (req, res) => {
     try {
          const { pageId } = req.params;

          const data = await Faq.findOne({ pageSlug: pageId });

          if (!data) {
               return res.json({ faq: [] });
          }

          res.json(data);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// Create or Update data for a specific page
export const updateFaq = async (req, res) => {
     try {
          const { pageId } = req.params;
          const { faq } = req.body;

          let data = await Faq.findOne({ pageSlug: pageId });

          if (data) {
               data.faq = faq;
               await data.save();
          } else {
               data = await Faq.create({
                    pageSlug: pageId,
                    faq
               });
          }

          res.json(data);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};