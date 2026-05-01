// controllers/serviceHeroController.js
import ServiceHero from "../models/ServiceHero.js";

export const getServiceHero = async (req, res) => {
     try {
          const data = await ServiceHero.findOne().sort({ createdAt: -1 });
          res.json(data);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

export const createServiceHero = async (req, res) => {
     try {
          const { title, description, points } = req.body;

          const item = new ServiceHero({ title, description, points });
          await item.save();

          res.json(item);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

export const updateServiceHero = async (req, res) => {
     try {
          const { id } = req.params;
          const { title, description, points } = req.body;

          const item = await ServiceHero.findByIdAndUpdate(
               id,
               { title, description, points },
               { new: true }
          );

          res.json(item);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

export const deleteServiceHero = async (req, res) => {
     try {
          const { id } = req.params;

          await ServiceHero.findByIdAndDelete(id);
          res.json({ message: "Deleted" });
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};