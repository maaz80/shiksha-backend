import Faq from "../models/Faq.js";
import mongoose from "mongoose";

// Get data for a specific page
export const getFaq = async (req, res) => {
     try {
          const { pageId } = req.params;

          const data = await Faq.findOne({ pageSlug: pageId });

          if (!data) {
               return res.json({ title: "FAQ", faq: [] });
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
          const { faq, title } = req.body;

          let data = await Faq.findOne({ pageSlug: pageId });

          if (data) {
               data.faq = faq;
               if (title !== undefined) {
                    data.title = title;
               }
               await data.save();
          } else {
               data = await Faq.create({
                    pageSlug: pageId,
                    faq,
                    title: title || "FAQ"
               });
          }

          res.json(data);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};