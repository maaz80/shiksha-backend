// controllers/locationHeroController.js
import LocationHero from "../models/LocationHero.js";

export const getLocationHero = async (req, res) => {
     try {
          const data = await LocationHero.findOne().sort({ createdAt: -1 });
          res.json(data);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

export const createLocationHero = async (req, res) => {
     try {
          const { title, description, points } = req.body;

          const item = new LocationHero({ title, description, points });
          await item.save();

          res.json(item);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

export const updateLocationHero = async (req, res) => {
     try {
          const { id } = req.params;
          const { title, description, points } = req.body;

          const item = await LocationHero.findByIdAndUpdate(
               id,
               { title, description, points },
               { new: true }
          );

          res.json(item);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

export const deleteLocationHero = async (req, res) => {
     try {
          const { id } = req.params;

          await LocationHero.findByIdAndDelete(id);
          res.json({ message: "Deleted" });
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};