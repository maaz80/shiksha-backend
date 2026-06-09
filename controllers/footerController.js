import FooterColumn from "../models/FooterColumn.js";

// GET ALL FOOTER COLUMNS
export const getFooterColumns = async (req, res) => {
     try {
          const columns = await FooterColumn.find().sort({ order: 1 });
          res.json(columns);
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
