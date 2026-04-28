import Course from "../models/Course.js";

// CREATE
export const createCourse = async (req, res) => {
     try {

          // ✅ STRING → OBJECT conversion
          const parsedSections = req.body.sections
               ? JSON.parse(req.body.sections)
               : [];

          const course = new Course({
               ...req.body,
               sections: parsedSections,   // ✅ FIX
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
     const courses = await Course.find();
     res.json(courses);
};


// GET ONE
export const getCourse = async (req, res) => {
     const course = await Course.findById(req.params.id);
     res.json(course);
};


// UPDATE
export const updateCourse = async (req, res) => {

     try {

          // ✅ AGAIN parse (VERY IMPORTANT)
          const parsedSections = req.body.sections
               ? JSON.parse(req.body.sections)
               : [];

          const updated = await Course.findByIdAndUpdate(
               req.params.id,
               {
                    ...req.body,
                    sections: parsedSections,  // ✅ FIX
                    ...(req.file && { image: req.file.path })
               },
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