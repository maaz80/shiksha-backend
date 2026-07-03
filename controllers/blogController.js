import Blog, { BlogPage } from "../models/Blog.js";

// slug generator
const createSlug = (title) => {
     return title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "") // Keep alphanumeric, spaces, and existing hyphens
          .replace(/\s+/g, "-");
};

// ✅ GET ALL BLOGS
export const getBlogs = async (req, res) => {
     try {
          const blogs = await Blog.find().sort({ createdAt: -1 });
          res.json(blogs);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// ✅ GET SINGLE BLOG BY SLUG ⭐ NEW
export const getBlogBySlug = async (req, res) => {
     try {
          const { slug } = req.params;

          const blog = await Blog.findOne({ slug });

          if (!blog) {
               return res.status(404).json({ error: "Blog not found" });
          }

          res.json(blog);

     } catch (error) {
          res.status(500).json({ error: error.message });
     }
};

// ✅ CREATE BLOG
export const createBlog = async (req, res) => {
     try {
          const title = req.body.title;
          const alt = req.body.alt;
          const category = req.body.category;
          const date = req.body.date;
          const author = req.body.author;
          const description = req.body.description;
          const content = req.body.content;

          // 🔥 IMPORTANT FIX
          const seoTitle = req.body.seoTitle;
          const seoKeywords = req.body.seoKeywords;
          const seoDescription = req.body.seoDescription;

          const imageUrl = req.file?.path || "";

          const baseSlug = createSlug(title);
          let slug = baseSlug;
          let count = 1;

          while (await Blog.findOne({ slug })) {
               slug = `${baseSlug}_${count++}`;
          }

          const faq = req.body.faq ? (typeof req.body.faq === "string" ? JSON.parse(req.body.faq) : req.body.faq) : [];

          const blog = new Blog({
               title,
               alt,
               slug,
               category,
               date,
               author,
               description,
               content,
               image: imageUrl,
               faq,

               // 🔥 SAFE SAVE
               seoTitle: seoTitle || title,
               seoDescription: seoDescription || content.slice(0, 150),
               seoKeywords: seoKeywords || ""
          });

          await blog.save();
          res.json(blog);

     } catch (error) {
          res.status(500).json({ error: error.message });
     }
};

// ✅ UPDATE BLOG
export const updateBlog = async (req, res) => {
     try {
          const { id } = req.params;

          const updateData = { ...req.body };

          // title change → slug update + duplicate handle
          if (req.body.title) {
               const baseSlug = createSlug(req.body.title);
               let slug = baseSlug;
               let count = 1;

               while (await Blog.findOne({ slug })) {
                    slug = `${baseSlug}_${count++}`;
               }

               updateData.slug = slug;
          }
          if (req.body.title) {
               updateData.seoTitle = req.body.seoTitle || req.body.title;
          }
          if (req.body.slug) {
               updateData.slug = req.body.slug;
          }

          if (req.body.content) {
               updateData.seoDescription =
                    req.body.seoDescription || req.body.content.slice(0, 150);
          }

          if (req.body.seoKeywords) {
               updateData.seoKeywords = req.body.seoKeywords;
          }
          
          if (req.body.faq) {
               updateData.faq = typeof req.body.faq === "string" ? JSON.parse(req.body.faq) : req.body.faq;
          }

          if (req.file) {
               updateData.image = req.file.path;
          }

          const blog = await Blog.findByIdAndUpdate(
               id,
               updateData,
               { new: true }
          );

          res.json(blog);

     } catch (error) {
          res.status(500).json({ error: error.message });
     }
};

// ✅ DELETE BLOG
export const deleteBlog = async (req, res) => {
     try {
          await Blog.findByIdAndDelete(req.params.id);
          res.json({ message: "Deleted" });
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// ✅ GET BLOG PAGE DATA (TITLES)
export const getBlogPageData = async (req, res) => {
     try {
          const pageData = await BlogPage.findOne();
          if (!pageData) {
               return res.json({
                    blogstitle: "Our Blogs",
                    featuredblogstitle: "Featured Blogs"
               });
          }
          res.json(pageData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// ✅ UPDATE BLOG PAGE DATA (TITLES)
export const updateBlogPageData = async (req, res) => {
     try {
          const pageData = await BlogPage.findOneAndUpdate({}, req.body, {
               upsert: true,
               new: true,
               setDefaultsOnInsert: true
          });
          res.json(pageData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};