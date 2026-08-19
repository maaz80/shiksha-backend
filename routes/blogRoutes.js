import express from "express";
import upload from "../middleware/multer.js";

import {
     getBlogs,
     createBlog,
     updateBlog,
     deleteBlog,
     getBlogBySlug,
     getBlogPageData,
     updateBlogPageData
} from "../controllers/blogController.js";

const router = express.Router();

const blogUploadMiddleware = upload.fields([
     { name: "image", maxCount: 1 },
     { name: "authorImageFile", maxCount: 1 }
]);

router.get("/blogpage-data", getBlogPageData);
router.put("/blogpage-data", updateBlogPageData);

router.get("/blogs", getBlogs);
router.get("/blogs/:slug", getBlogBySlug);
router.post("/blogs", blogUploadMiddleware, createBlog);

router.put("/blogs/:id", blogUploadMiddleware, updateBlog);

router.delete("/blogs/:id", deleteBlog);

export default router;