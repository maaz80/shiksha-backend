import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (id) => {
     return jwt.sign({ id }, process.env.JWT_SECRET || "your-secret-key", {
          expiresIn: "7d",
     });
};

export const signup = async (req, res) => {
     try {
          const { name, email, password } = req.body;

          // Validation
          if (!name || !email || !password) {
               return res.status(400).json({ error: "Please provide all fields" });
          }

          // Check if user exists
          const userExists = await User.findOne({ email });
          if (userExists) {
               return res.status(400).json({ error: "User already exists" });
          }

          // Create user
          const user = await User.create({
               name,
               email,
               password,
          });

          // Generate token
          const token = generateToken(user._id);

          res.status(201).json({
               success: true,
               token,
               user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
               },
          });
     } catch (error) {
          res.status(500).json({ error: error.message });
     }
};

export const login = async (req, res) => {
     try {
          const { email, password } = req.body;

          // Validation
          if (!email || !password) {
               return res.status(400).json({ error: "Please provide email and password" });
          }

          // Check if user exists and get password field
          const user = await User.findOne({ email }).select("+password");

          if (!user) {
               return res.status(401).json({ error: "Invalid credentials" });
          }

          // Check password
          const isMatched = await user.matchPassword(password);
          if (!isMatched) {
               return res.status(401).json({ error: "Invalid credentials" });
          }

          // Generate token
          const token = generateToken(user._id);

          res.json({
               success: true,
               token,
               user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
               },
          });
     } catch (error) {
          res.status(500).json({ error: error.message });
     }
};

export const getMe = async (req, res) => {
     try {
          const user = await User.findById(req.userId).populate('enrolledCourses.courseId');

          if (!user) {
               return res.status(404).json({ error: "User not found" });
          }

          res.json({
               success: true,
               user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    enrolledCourses: user.enrolledCourses,
               },
          });
     } catch (error) {
          res.status(500).json({ error: error.message });
     }
};

export const logout = async (req, res) => {
     res.json({ success: true, message: "Logged out successfully" });
};
