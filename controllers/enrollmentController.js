import User from "../models/User.js";
import Course from "../models/Course.js";

const getCompletedLessonKeys = (course, completedLessons = []) => {
     const completedLessonIds = new Set(
          completedLessons.map((lessonId) => lessonId?.toString())
     );
     const completedLessonKeys = [];

     course.sections?.forEach((section, sectionIndex) => {
          section.lessons?.forEach((lesson, lessonIndex) => {
               if (completedLessonIds.has(lesson._id.toString())) {
                    completedLessonKeys.push(`${sectionIndex}-${lessonIndex}`);
               }
          });
     });

     return completedLessonKeys;
};

// Enroll user in a course (Start Now)
export const enrollCourse = async (req, res) => {
     try {
          const { courseId } = req.body;
          const userId = req.userId;

          // Validate input
          if (!courseId) {
               return res.status(400).json({ error: "Course ID is required" });
          }

          if (!userId) {
               return res.status(401).json({ error: "User not authenticated" });
          }

          // Check if course exists
          const course = await Course.findById(courseId);
          if (!course) {
               return res.status(404).json({ error: "Course not found" });
          }

          // Check if user exists
          const user = await User.findById(userId);
          if (!user) {
               return res.status(404).json({ error: "User not found" });
          }

          // Ensure enrolledCourses is an array
          if (!Array.isArray(user.enrolledCourses)) {
               user.enrolledCourses = [];
          }

          // Check if user already enrolled
          const alreadyEnrolled = user.enrolledCourses.some(
               (e) => e.courseId && e.courseId.toString() === courseId
          );

          if (alreadyEnrolled) {
               return res.status(400).json({ error: "Already enrolled in this course" });
          }

          // Enroll user
          user.enrolledCourses.push({
               courseId,
               enrolledAt: new Date(),
               progress: 0,
               completedLessons: [],
          });

          await user.save();

          res.json({
               success: true,
               message: "Enrolled successfully",
               enrollment: {
                    progress: 0,
                    completedLessons: [],
               },
               user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    enrolledCourses: user.enrolledCourses,
               },
          });
     } catch (error) {
          console.error("Enrollment error:", error);
          res.status(500).json({ error: error.message || "Failed to enroll in course" });
     }
};

// Mark lesson as completed
export const completeLessonAndUnlockNext = async (req, res) => {
     try {
          const { courseId, sectionIndex, lessonIndex } = req.body;
          const userId = req.userId;

          if (!courseId || sectionIndex === undefined || lessonIndex === undefined) {
               return res.status(400).json({ error: "Missing required fields" });
          }

          // Find course
          const course = await Course.findById(courseId);
          if (!course) {
               return res.status(404).json({ error: "Course not found" });
          }

          // Get lesson ID
          const lesson = course.sections?.[sectionIndex]?.lessons?.[lessonIndex];
          if (!lesson) {
               return res.status(404).json({ error: "Lesson not found" });
          }

          // Find user enrollment
          const user = await User.findById(userId);
          const enrollment = user.enrolledCourses.find(
               (e) => e.courseId.toString() === courseId
          );

          if (!enrollment) {
               return res.status(404).json({ error: "User not enrolled in this course" });
          }

          // Mark current lesson as completed
          const alreadyCompleted = enrollment.completedLessons.some(
               (completedLessonId) => completedLessonId.toString() === lesson._id.toString()
          );

          if (!alreadyCompleted) {
               enrollment.completedLessons.push(lesson._id);
          }

          // Update progress
          const totalLessons = course.sections.reduce(
               (total, section) => total + (section.lessons?.length || 0),
               0
          );
          enrollment.progress = Math.round(
               (enrollment.completedLessons.length / totalLessons) * 100
          );

          await user.save();

          res.json({
               success: true,
               message: "Lesson completed",
               enrollment: {
                    progress: enrollment.progress,
                    completedLessons: getCompletedLessonKeys(course, enrollment.completedLessons),
               },
          });
     } catch (error) {
          res.status(500).json({ error: error.message });
     }
};

// Get user enrollment status for a course
export const getCourseEnrollment = async (req, res) => {
     try {
          const { courseId } = req.params;
          const userId = req.userId;

          const user = await User.findById(userId);
          const course = await Course.findById(courseId);

          if (!course) {
               return res.status(404).json({ error: "Course not found" });
          }

          const enrollment = user.enrolledCourses.find(
               (e) => e.courseId.toString() === courseId
          );

          if (!enrollment) {
               return res.json({
                    enrolled: false,
               });
          }

          res.json({
               enrolled: true,
               enrollment: {
                    progress: enrollment.progress,
                    completedLessons: getCompletedLessonKeys(course, enrollment.completedLessons),
               },
          });
     } catch (error) {
          res.status(500).json({ error: error.message });
     }
};
