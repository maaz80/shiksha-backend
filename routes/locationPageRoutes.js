// routes/locationPageRoutes.js
import express from "express";
import {
     createLocationPage,
     updateLocationPage,
     getLocationPage,
     deleteLocationPage
} from "../controllers/locationPageController.js";
import upload from "../middleware/multer.js";

const router = express.Router();

// ✅ IMPORTANT: multiple images support
router.post(
     "/location-page",
     upload.array("serviceImages"),
     createLocationPage
);

router.put(
     "/location-page/:id",
     upload.array("serviceImages"),
     updateLocationPage
);

router.get("/location-page", getLocationPage);
router.delete("/location-page/:id", deleteLocationPage);

export default router;