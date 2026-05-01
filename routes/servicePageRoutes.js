// routes/servicePageRoutes.js
import express from "express";
import {
     createServicePage,
     updateServicePage,
     getServicePage,
     deleteServicePage
} from "../controllers/servicePageController.js";
import upload from "../middleware/multer.js";

const router = express.Router();

// ✅ IMPORTANT: multiple images support
router.post(
     "/service-page",
     upload.array("serviceImages"),
     createServicePage
);

router.put(
     "/service-page/:id",
     upload.array("serviceImages"),
     updateServicePage
);

router.get("/service-page", getServicePage);
router.delete("/service-page/:id", deleteServicePage);

export default router;