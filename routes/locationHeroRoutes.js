// routes/locationHeroRoutes.js
import express from "express";
import {
     getLocationHero,
     createLocationHero,
     updateLocationHero,
     deleteLocationHero,
} from "../controllers/locationHeroController.js";

const router = express.Router();

router.get("/location-hero", getLocationHero);
router.post("/location-hero", createLocationHero);
router.put("/location-hero/:id", updateLocationHero);
router.delete("/location-hero/:id", deleteLocationHero);

export default router;