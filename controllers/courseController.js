import mongoose from "mongoose";
import Course, { CoursePage } from "../models/Course.js";

const createSlug = (title) => {
     return title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "") // Keep alphanumeric, spaces, and existing hyphens
          .replace(/\s+/g, "-");
};

const generateUniqueSlug = async (title, excludeId = null) => {
     const baseSlug = createSlug(title) || "course";
     let slug = baseSlug;
     let count = 1;

     while (await Course.findOne({
          slug,
          ...(excludeId && { _id: { $ne: excludeId } })
     })) {
          slug = `${baseSlug}_${count++}`;
     }

     return slug;
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const parseSections = (sections) => {
     if (!sections) return [];
     return typeof sections === "string" ? JSON.parse(sections) : sections;
};

const parseFaq = (faq) => {
     if (!faq) return [];
     return typeof faq === "string" ? JSON.parse(faq) : faq;
};

const ensureCourseSlug = async (course) => {
     if (!course || course.slug) return course;

     course.slug = await generateUniqueSlug(course.title || course.name || "course", course._id);
     await course.save();
     return course;
};

// CREATE
export const createCourse = async (req, res) => {
     try {
          const parsedSections = parseSections(req.body.sections);
          const parsedFaq = parseFaq(req.body.faq);
          const slug = await generateUniqueSlug(req.body.title || req.body.name);

          const course = new Course({
               ...req.body,
               slug,
               sections: parsedSections,
               faq: parsedFaq,
               image: req.file?.path
          });

          await course.save();
          res.json(course);

     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

export const uploadCourseVideo = async (req, res) => {
     try {
          if (!req.file) {
               return res.status(400).json({ error: "No video file uploaded." });
          }

          res.json({ url: req.file.path });
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// GET ALL
export const getCourses = async (req, res) => {
     try {
          const courses = await Course.find();
          for (const course of courses) {
               await ensureCourseSlug(course);
          }
          res.json(courses);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// GET ONE
export const getCourse = async (req, res) => {
     try {
          const { slug } = req.params;
          const course = isObjectId(slug)
               ? await Course.findById(slug)
               : await Course.findOne({ slug });

          if (!course) {
               return res.status(404).json({ error: "Course not found" });
          }

          await ensureCourseSlug(course);
          res.json(course);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// UPDATE
export const updateCourse = async (req, res) => {
     try {
          const updateData = { ...req.body };

          if (req.body.sections) {
               updateData.sections = parseSections(req.body.sections);
          }

          if (req.body.faq) {
               updateData.faq = parseFaq(req.body.faq);
          }

          if (req.body.title || req.body.name) {
               updateData.slug = await generateUniqueSlug(
                    req.body.title || req.body.name,
                    req.params.id
               );
          }

          if (req.file) {
               updateData.image = req.file.path;
          }

          const updated = await Course.findByIdAndUpdate(
               req.params.id,
               updateData,
               { new: true }
          );

          res.json(updated);

     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// DELETE
export const deleteCourse = async (req, res) => {
     await Course.findByIdAndDelete(req.params.id);
     res.json({ success: true });
};

// ADD REVIEW
export const addCourseReview = async (req, res) => {
     try {
          const { id } = req.params;
          const { name, role, rating, text } = req.body;

          if (!name || !rating || !text) {
               return res.status(400).json({ error: "Please fill in all fields" });
          }

          const course = await Course.findById(id);
          if (!course) {
               return res.status(404).json({ error: "Course not found" });
          }

          const image = req.file ? req.file.path : undefined;

          course.reviews.push({ name, role, rating: Number(rating), text, image });
          await course.save();

          res.status(201).json(course);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// DELETE REVIEW
export const deleteCourseReview = async (req, res) => {
     try {
          const { id, reviewId } = req.params;

          const course = await Course.findById(id);
          if (!course) {
               return res.status(404).json({ error: "Course not found" });
          }

          course.reviews = course.reviews.filter((r) => String(r._id) !== String(reviewId));
          await course.save();

          res.json(course);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

export const getAllReviews = async (req, res) => {
     try {
          const courses = await Course.find({}, { name: 1, title: 1, reviews: 1 });
          const allReviews = [];

          courses.forEach((course) => {
               if (course.reviews && course.reviews.length > 0) {
                    course.reviews.forEach((review) => {
                         allReviews.push({
                              _id: review._id,
                              name: review.name,
                              rating: review.rating,
                              text: review.text,
                              image: review.image,
                              date: review.date,
                              role: review.role || "",
                              courseName: course.name || course.title || "Student"
                         });
                    });
               }
          });

          // Sort by date descending (latest reviews first)
          allReviews.sort((a, b) => new Date(b.date) - new Date(a.date));

          res.json(allReviews);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// ✅ GET COURSE PAGE DATA (TITLES)
export const getCoursePageData = async (req, res) => {
     try {
          const pageData = await CoursePage.findOne();
          if (!pageData) {
               return res.json({
                    coursestitle: "All Courses"
               });
          }
          res.json(pageData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// ✅ UPDATE COURSE PAGE DATA (TITLES)
export const updateCoursePageData = async (req, res) => {
     try {
          const pageData = await CoursePage.findOneAndUpdate({}, req.body, {
               upsert: true,
               new: true,
               setDefaultsOnInsert: true
          });
          res.json(pageData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};
