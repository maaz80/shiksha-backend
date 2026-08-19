import express from "express";
import upload from "../middleware/multer.js";
import {
     getAuthorTemplates,
     createAuthorTemplate,
     updateAuthorTemplate,
     deleteAuthorTemplate
} from "../controllers/authorTemplateController.js";

const router = express.Router();

router.get("/author-templates", getAuthorTemplates);
router.post("/author-templates", upload.single("image"), createAuthorTemplate);
router.put("/author-templates/:id", upload.single("image"), updateAuthorTemplate);
router.delete("/author-templates/:id", deleteAuthorTemplate);

export default router;
