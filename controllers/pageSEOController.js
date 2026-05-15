import PageSEO from "../models/PageSEO.js";
import mongoose from "mongoose";

// Get SEO for a specific page
export const getPageSEO = async (req, res) => {
     try {
          const { pageId } = req.params;

          const seo = await PageSEO.findOne({ pageSlug: pageId });

          if (!seo) {
               return res.json({ title: "", description: "", keywords: "" });
          }

          res.json(seo);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// Create or Update SEO for a specific page
export const updatePageSEO = async (req, res) => {
     try {
          const { pageId } = req.params;
          const { title, description, keywords } = req.body;

          let seo = await PageSEO.findOne({ pageSlug: pageId });

          if (seo) {
               seo.title = title;
               seo.description = description;
               seo.keywords = keywords;
               await seo.save();
          } else {
               seo = await PageSEO.create({
                    pageSlug: pageId,
                    title,
                    description,
                    keywords
               });
          }

          res.json(seo);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};