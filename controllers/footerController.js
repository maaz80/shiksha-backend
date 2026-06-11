import FooterColumn from "../models/FooterColumn.js";

// GET ALL FOOTER COLUMNS
export const getFooterColumns = async (req, res) => {
     try {
          const columns = await FooterColumn.find({ isGlobal: { $ne: true } }).sort({ order: 1 });
          res.json(columns);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// GET FOOTER GLOBAL SETTINGS
export const getFooterGlobalSettings = async (req, res) => {
     try {
          let settings = await FooterColumn.findOne({ isGlobal: true });
          if (!settings) {
               settings = new FooterColumn({
                    isGlobal: true,
                    navigation: [
                         { itemname: "Home", itempath: "/" },
                         { itemname: "Blogs", itempath: "/category/blogs" },
                         { itemname: "Courses", itempath: "/courses" },
                         { itemname: "About us", itempath: "/about-us" },
                         { itemname: "Disclaimer", itempath: "/disclaimer" },
                         { itemname: "Privacy Policy", itempath: "/privacy-policy" },
                         { itemname: "Contact us", itempath: "/contact-us" }
                    ],
                    socials: [
                         { icon: "FaFacebookF", path: "#" },
                         { icon: "RiTwitterXLine", path: "#" },
                         { icon: "FaInstagram", path: "#" },
                         { icon: "FaLinkedinIn", path: "#" },
                         { icon: "CiYoutube", path: "#" }
                    ],
                    buttonname: "Refer & Earn",
                    buttontitle: "Follow us!",
                    copyright: "© 2026 - Shiksha Design All Rights Reserved."
               });
               await settings.save();
          }
          res.json(settings);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// UPDATE FOOTER GLOBAL SETTINGS
export const updateFooterGlobalSettings = async (req, res) => {
     try {
          const { navigation, socials, buttonname, buttontitle, copyright } = req.body;
          const updated = await FooterColumn.findOneAndUpdate(
               { isGlobal: true },
               {
                    navigation: navigation || [],
                    socials: socials || [],
                    buttonname: buttonname || "",
                    buttontitle: buttontitle || "",
                    copyright: copyright || ""
               },
               { new: true, upsert: true }
          );
          res.json(updated);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// CREATE FOOTER COLUMN
export const createFooterColumn = async (req, res) => {
     try {
          const { title, links, order } = req.body;
          if (!title) {
               return res.status(400).json({ error: "Title is required" });
          }

          const column = new FooterColumn({
               title,
               links: links || [],
               order: order || 0
          });

          await column.save();
          res.status(201).json(column);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// UPDATE FOOTER COLUMN
export const updateFooterColumn = async (req, res) => {
     try {
          const { id } = req.params;
          const { title, links, order } = req.body;

          const updated = await FooterColumn.findByIdAndUpdate(
               id,
               { title, links, order },
               { new: true }
          );

          if (!updated) {
               return res.status(404).json({ error: "Footer column not found" });
          }

          res.json(updated);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// DELETE FOOTER COLUMN
export const deleteFooterColumn = async (req, res) => {
     try {
          const { id } = req.params;
          const deleted = await FooterColumn.findByIdAndDelete(id);

          if (!deleted) {
               return res.status(404).json({ error: "Footer column not found" });
          }

          res.json({ success: true, message: "Column deleted successfully" });
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};
