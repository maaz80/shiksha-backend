import crypto from "crypto";
import { createAdminToken } from "../middleware/adminAuth.js";
import User from "../models/User.js";
import Course from "../models/Course.js";

const safeCompare = (receivedValue, expectedValue) => {
     const received = Buffer.from(receivedValue || "");
     const expected = Buffer.from(expectedValue || "");

     if (received.length !== expected.length) {
          return false;
     }

     return crypto.timingSafeEqual(received, expected);
};

export const loginAdmin = (req, res) => {
     const { username, password } = req.body;
     const adminUsername = process.env.ADMIN_USERNAME;
     const adminPassword = process.env.ADMIN_PASSWORD;

     if (!adminUsername || !adminPassword) {
          return res.status(503).json({ error: "Admin login is not configured." });
     }

     if (!safeCompare(username, adminUsername) || !safeCompare(password, adminPassword)) {
          return res.status(401).json({ error: "Invalid username or password." });
     }

     const token = createAdminToken();

     res.json({
          token,
          expiresIn: 30 * 24 * 60 * 60
     });
};

// Admin: Unlock / Assign course for user
export const assignCourseToUser = async (req, res) => {
     try {
          const { userId, courseId, courseSlug } = req.body;

          if (!userId || (!courseId && !courseSlug)) {
               return res.status(400).json({ error: "Please provide userId and courseId or courseSlug" });
          }

          const user = await User.findById(userId);
          if (!user) {
               return res.status(404).json({ error: "User not found" });
          }

          let targetCourseId = courseId;
          let targetCourseSlug = courseSlug;

          if ((!targetCourseId || !targetCourseSlug) && (courseId || courseSlug)) {
               const query = courseId ? { _id: courseId } : { slug: courseSlug };
               const foundCourse = await Course.findOne(query).lean();
               if (foundCourse) {
                    targetCourseId = foundCourse._id;
                    targetCourseSlug = foundCourse.slug;
               }
          }

          if (!Array.isArray(user.enrolledCourses)) {
               user.enrolledCourses = [];
          }

          const targetIdStr = targetCourseId ? targetCourseId.toString().toLowerCase() : "";
          const targetSlugStr = targetCourseSlug ? targetCourseSlug.toString().toLowerCase() : "";

          const alreadyEnrolled = user.enrolledCourses.some((item) => {
               const itemCId = item.courseId ? item.courseId.toString().toLowerCase() : "";
               const itemCSlug = item.courseSlug ? item.courseSlug.toString().toLowerCase() : "";
               return (targetIdStr && itemCId === targetIdStr) || (targetSlugStr && itemCSlug === targetSlugStr);
          });

          if (!alreadyEnrolled) {
               user.enrolledCourses.push({
                    courseId: targetCourseId || undefined,
                    courseSlug: targetCourseSlug || undefined,
                    enrolledAt: new Date(),
                    progress: 0,
                    completedLessons: [],
               });
               await user.save();
          }

          return res.json({
               success: true,
               message: "Course unlocked/assigned for user successfully",
               enrolledCourses: user.enrolledCourses,
          });
     } catch (error) {
          console.error("assignCourseToUser error:", error);
          return res.status(500).json({ error: error.message });
     }
};

// Admin: Lock / Revoke course from user
export const revokeCourseFromUser = async (req, res) => {
     try {
          const { userId, courseId, courseSlug } = req.body;

          if (!userId || (!courseId && !courseSlug)) {
               return res.status(400).json({ error: "Please provide userId and courseId or courseSlug" });
          }

          const user = await User.findById(userId);
          if (!user) {
               return res.status(404).json({ error: "User not found" });
          }

          const targetIdStr = courseId ? courseId.toString().toLowerCase() : "";
          const targetSlugStr = courseSlug ? courseSlug.toString().toLowerCase() : "";

          user.enrolledCourses = (user.enrolledCourses || []).filter((item) => {
               const itemCId = item.courseId ? item.courseId.toString().toLowerCase() : "";
               const itemCSlug = item.courseSlug ? item.courseSlug.toString().toLowerCase() : "";

               if (targetIdStr && itemCId === targetIdStr) return false;
               if (targetSlugStr && itemCSlug === targetSlugStr) return false;
               return true;
          });

          await user.save();

          return res.json({
               success: true,
               message: "Course revoked/locked for user successfully",
               enrolledCourses: user.enrolledCourses,
          });
     } catch (error) {
          console.error("revokeCourseFromUser error:", error);
          return res.status(500).json({ error: error.message });
     }
};

// Admin: Get all registered users list
export const getAllUsers = async (req, res) => {
     try {
          const users = await User.find({})
               .select("-password")
               .sort({ createdAt: -1 })
               .populate("enrolledCourses.courseId");

          return res.json({
               success: true,
               users,
          });
     } catch (error) {
          console.error("getAllUsers error:", error);
          return res.status(500).json({ error: error.message });
     }
};
