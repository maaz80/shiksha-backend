import express from "express";
import {
     getImages,
     updateImagesConfig
} from "../controllers/imageController.js";

const router = express.Router();

router.get("/images", getImages);
router.put("/images", updateImagesConfig);

export default router;