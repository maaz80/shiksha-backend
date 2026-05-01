// routes/serviceHeroRoutes.js
import express from "express";
import {
     getServiceHero,
     createServiceHero,
     updateServiceHero,
     deleteServiceHero,
} from "../controllers/serviceHeroController.js";

const router = express.Router();

router.get("/service-hero", getServiceHero);
router.post("/service-hero", createServiceHero);
router.put("/service-hero/:id", updateServiceHero);
router.delete("/service-hero/:id", deleteServiceHero);

export default router;