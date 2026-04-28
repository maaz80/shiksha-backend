import express from "express";
import upload from "../middleware/multer.js";

import {
     getBlogs,
     createBlog,
     updateBlog,
     deleteBlog,
     getBlogBySlug
} from "../controllers/blogController.js";

const router = express.Router();

router.get("/blogs", getBlogs);
router.get("/blogs/:slug", getBlogBySlug);
router.post("/blogs", upload.single("image"), createBlog);

router.put("/blogs/:id", upload.single("image"), updateBlog);

router.delete("/blogs/:id", deleteBlog);

export default router;