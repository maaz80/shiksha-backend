import AuthorTemplate from "../models/AuthorTemplate.js";

// GET ALL AUTHOR TEMPLATES
export const getAuthorTemplates = async (req, res) => {
     try {
          const templates = await AuthorTemplate.find().sort({ createdAt: -1 });
          res.json(templates);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// CREATE AUTHOR TEMPLATE
export const createAuthorTemplate = async (req, res) => {
     try {
          const { name, designation, bio, twitter, image } = req.body;
          const imageUrl = req.file?.path || image || "";

          const template = new AuthorTemplate({
               name,
               designation: designation || "",
               image: imageUrl,
               bio: bio || "",
               twitter: twitter || ""
          });

          await template.save();
          res.status(201).json(template);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// UPDATE AUTHOR TEMPLATE
export const updateAuthorTemplate = async (req, res) => {
     try {
          const { id } = req.params;
          const updateData = { ...req.body };

          if (req.file) {
               updateData.image = req.file.path;
          }

          const updated = await AuthorTemplate.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
          res.json(updated);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// DELETE AUTHOR TEMPLATE
export const deleteAuthorTemplate = async (req, res) => {
     try {
          await AuthorTemplate.findByIdAndDelete(req.params.id);
          res.json({ message: "Author template deleted successfully" });
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};
