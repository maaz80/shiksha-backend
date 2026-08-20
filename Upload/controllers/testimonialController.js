import Testimonial from "../models/Testimonial.js";

// GET ALL TESTIMONIALS
export const getTestimonials = async (req, res) => {
     try {
          const testimonials = await Testimonial.find().sort({ createdAt: -1 });
          res.json(testimonials);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// CREATE TESTIMONIAL
export const createTestimonial = async (req, res) => {
     try {
          const { name, quote, role } = req.body;
          if (!name || !quote) {
               return res.status(400).json({ error: "Name and quote are required." });
          }

          const testimonial = new Testimonial({
               name: name.trim(),
               quote: quote.trim(),
               role: role ? role.trim() : "Student"
          });

          await testimonial.save();
          res.status(201).json(testimonial);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// UPDATE TESTIMONIAL
export const updateTestimonial = async (req, res) => {
     try {
          const { id } = req.params;
          const { name, quote, role } = req.body;

          const updated = await Testimonial.findByIdAndUpdate(
               id,
               {
                    ...(name && { name: name.trim() }),
                    ...(quote && { quote: quote.trim() }),
                    ...(role !== undefined && { role: role.trim() })
               },
               { returnDocument: 'after' }
          );

          if (!updated) {
               return res.status(404).json({ error: "Testimonial not found." });
          }

          res.json(updated);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// DELETE TESTIMONIAL
export const deleteTestimonial = async (req, res) => {
     try {
          const { id } = req.params;
          const deleted = await Testimonial.findByIdAndDelete(id);
          if (!deleted) {
               return res.status(404).json({ error: "Testimonial not found." });
          }
          res.json({ success: true, message: "Testimonial deleted successfully." });
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};
