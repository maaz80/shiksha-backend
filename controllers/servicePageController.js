// controllers/servicePageController.js
import ServicePage from "../models/ServicePage.js";

export const getServicePage = async (req, res) => {
     try {
          const data = await ServicePage.findOne().sort({ createdAt: -1 });
          res.json(data);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};


export const createServicePage = async (req, res) => {
     try {
          const body = req.body;

          // ✅ Parse JSON (important)
          const parsed = JSON.parse(body.data);

          // ✅ Attach uploaded images
          const images = req.files || [];

          parsed.service.cards = parsed.service.cards.map((card, i) => ({
               ...card,
               image: images[i]?.path || ""
          }));

          const item = new ServicePage(parsed);
          await item.save();

          res.json(item);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};


export const updateServicePage = async (req, res) => {
     try {
          const { id } = req.params;

          const parsed = JSON.parse(req.body.data);
          const images = req.files || [];
          const indexes = req.body.serviceImageIndex || [];

          const indexArray = Array.isArray(indexes) ? indexes : [indexes];

          // ✅ old images retain
          parsed.service.cards = parsed.service.cards.map((card) => ({
               ...card,
               image: card.image || ""
          }));

          // ✅ only update changed images
          images.forEach((file, idx) => {
               const index = indexArray[idx];

               if (parsed.service.cards[index]) {
                    parsed.service.cards[index].image = file.path;
               }
          });

          const updated = await ServicePage.findByIdAndUpdate(
               id,
               parsed,
               { new: true }
          );

          res.json(updated);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

export const deleteServicePage = async (req, res) => {
     try {
          const { id } = req.params;
          await ServicePage.findByIdAndDelete(id);
          res.json({ message: "Deleted" });
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};