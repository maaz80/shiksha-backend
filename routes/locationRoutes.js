import express from "express";
import upload from "../middleware/multer.js";

import {
  getLocations,
  getLocationById,
  getLocationBySlug,
  createLocation,
  updateLocation,
  deleteLocation,
  addItem,
  getItem,
  updateItem,
  deleteItem
} from "../controllers/locationController.js";

const router = express.Router();


// ===== SERVICE =====
router.get("/locations", getLocations);
router.get("/locations/slug/:slug", getLocationBySlug);
router.get("/locations/:id", getLocationById);
router.post("/locations", upload.single("image"), createLocation);
router.put("/locations/:id", upload.single("image"), updateLocation);
router.delete("/locations/:id", deleteLocation);
router.put("/locations/slug/:slug", upload.single("image"), updateLocation);
router.delete("/locations/slug/:slug", deleteLocation);


// ===== ITEMS (IMPORTANT) =====
router.post("/locations/:locationId/items", upload.none(), addItem);
router.get("/locations/:locationId/items/:itemId", getItem);
router.put("/locations/:locationId/items/:itemId", upload.any(), updateItem);
router.delete("/locations/:locationId/items/:itemId", deleteItem);
router.post("/locations/slug/:locationId/items", upload.none(), addItem);
router.get("/locations/slug/:locationId/items/:itemId", getItem);
router.put("/locations/slug/:locationId/items/:itemId", upload.any(), updateItem);
router.delete("/locations/slug/:locationId/items/:itemId", deleteItem);


export default router;
