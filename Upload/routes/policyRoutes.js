import express from "express";
import { getPolicyData, updatePolicyData } from "../controllers/policyController.js";

const router = express.Router();

router.get("/policy-data", getPolicyData);
router.put("/policy-data", updatePolicyData);

export default router;
