import express from "express";
import upload from "../middleware/multer.js";
import {
     uploadImage,
     getImages,
     deleteImage,
     updateImage
} from "../controllers/imageController.js";

const router = express.Router();

router.post("/images", upload.single("image"), uploadImage);

router.get("/images", getImages);

router.delete("/images/:id", deleteImage);

router.put("/images/:id", updateImage);

export default router;