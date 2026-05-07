import mongoose from "mongoose";
import Course from "../models/Course.js";

const createSlug = (title = "") => {
     return title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s]/g, "")
          .replace(/\s+/g, "_");
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
          const slug = await generateUniqueSlug(req.body.title || req.body.name);

          const course = new Course({
               ...req.body,
               slug,
               sections: parsedSections,
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
