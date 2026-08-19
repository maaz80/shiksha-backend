import express from "express";
import {
  getAllAuthors,
  getAuthorByIdOrSlug,
  createAuthor,
  updateAuthor,
  deleteAuthor,
} from "../controllers/authorController.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.get("/", getAllAuthors);
router.get("/:identifier", getAuthorByIdOrSlug);
router.post("/", upload.single("avatarFile"), createAuthor);
router.put("/:id", upload.single("avatarFile"), updateAuthor);
router.delete("/:id", deleteAuthor);

export default router;
