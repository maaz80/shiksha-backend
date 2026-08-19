import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { transporter } from "../config/mailer.js";
import OTP from "../models/otpModel.js";
import otpGenerator from "otp-generator";

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

export const forgotPassword = async (req, res) => {
     try {
          const { email } = req.body;

          if (!email) {
               return res.status(400).json({ error: "Please provide email" });
          }

          const user = await User.findOne({ email });
          if (!user) {
               return res.status(404).json({ error: "User with this email does not exist" });
          }

          // Generate 6-digit OTP
          const otp = Math.floor(100000 + Math.random() * 900000).toString();

          user.resetPasswordOTP = otp;
          user.resetPasswordOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

          await user.save();

          // Send Email
          await transporter.sendMail({
               from: process.env.EMAIL_FROM || '"Shiksha" <no-reply@shiksha.com>',
               to: email,
               subject: "Password Reset OTP - Shiksha",
               html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
                         <h2 style="color: #f97316; text-align: center;">Shiksha Password Reset</h2>
                         <p>Hello ${user.name},</p>
                         <p>You requested to reset your password. Use the following 6-digit OTP to reset it:</p>
                         <div style="text-align: center; margin: 30px 0;">
                              <span style="color: #f97316; font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 10px 20px; background: #fff7ed; border: 1.5px dashed #f97316; border-radius: 8px; display: inline-block;">${otp}</span>
                         </div>
                         <p style="color: #6b7280; font-size: 14px;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
                    </div>
               `
          });

          res.json({ success: true, message: "OTP sent to your email" });
     } catch (error) {
          console.error("Forgot password error:", error);
          res.status(500).json({ error: error.message || "Failed to send OTP" });
     }
};

export const resetPassword = async (req, res) => {
     try {
          const { email, otp, newPassword } = req.body;

          if (!email || !otp || !newPassword) {
               return res.status(400).json({ error: "Please provide all fields" });
          }

          if (newPassword.length < 6) {
               return res.status(400).json({ error: "Password must be at least 6 characters" });
          }

          // Find user with matching OTP and valid expiration
          const user = await User.findOne({
               email,
               resetPasswordOTP: otp,
               resetPasswordOTPExpires: { $gt: Date.now() }
          }).select("+resetPasswordOTP +resetPasswordOTPExpires +password");

          if (!user) {
               return res.status(400).json({ error: "Invalid or expired OTP" });
          }

          // Update password and clear OTP
          user.password = newPassword;
          user.resetPasswordOTP = undefined;
          user.resetPasswordOTPExpires = undefined;

          await user.save();

          res.json({ success: true, message: "Password reset successfully" });
     } catch (error) {
          console.error("Reset password error:", error);
          res.status(500).json({ error: error.message || "Failed to reset password" });
     }
};

export const sendOTP = async (req, res) => {
     try {
          const { email, type } = req.body;
          console.log(`[sendOTP] Request received for email: ${email}, type: ${type}`);

          if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
               console.log("[sendOTP] Validation failed: invalid email format");
               return res.status(400).json({ error: "Valid email address is required" });
          }

          if (!type || (type !== "login" && type !== "signup")) {
               console.log("[sendOTP] Validation failed: invalid request type");
               return res.status(400).json({ error: "Valid request type (login or signup) is required" });
          }

          // Check user existence
          console.log("[sendOTP] Checking user existence in DB...");
          const user = await User.findOne({ email });
          console.log(`[sendOTP] User check complete. User exists: ${!!user}`);

          if (type === "login" && !user) {
               console.log("[sendOTP] Login check failed: user does not exist");
               return res.status(404).json({ error: "No account found with this email. Please sign up." });
          }
          if (type === "signup" && user) {
               console.log("[sendOTP] Signup check failed: user already exists");
               return res.status(400).json({ error: "Account already exists with this email. Please log in." });
          }

          // Generate 6-digit OTP
          console.log("[sendOTP] Generating 6-digit OTP...");
          const otp = otpGenerator.generate(6, {
               digits: true,
               lowerCaseAlphabets: false,
               upperCaseAlphabets: false,
               specialChars: false
          });

          // Store OTP in database
          console.log("[sendOTP] Storing OTP in database...");
          await OTP.findOneAndUpdate(
               { email },
               { otp, attempts: 0, isVerified: false, createdAt: new Date() },
               { upsert: true, returnDocument: 'after' }
          );
          console.log("[sendOTP] OTP stored successfully in DB");

          // Send Email
          console.log("[sendOTP] Preparing to send email via nodemailer...");
          await transporter.sendMail({
               from: process.env.EMAIL_FROM || '"Shiksha" <no-reply@shiksha.com>',
               to: email,
               subject: "Your Shiksha Verification OTP",
               html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
                         <h2 style="color: #f97316; text-align: center;">Shiksha Verification</h2>
                         <p>Hello,</p>
                         <p>Use the following 6-digit OTP to complete your verification process:</p>
                         <div style="text-align: center; margin: 30px 0;">
                              <span style="color: #f97316; font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 10px 20px; background: #fff7ed; border: 1.5px dashed #f97316; border-radius: 8px; display: inline-block;">${otp}</span>
                         </div>
                         <p style="color: #6b7280; font-size: 14px;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
                    </div>
               `
          });
          console.log("[sendOTP] Email dispatched successfully");

          res.json({ success: true, message: "OTP sent to your email successfully" });
     } catch (error) {
          console.error("❌ [sendOTP] Error encountered:", error);
          res.status(500).json({ error: error.message || "Failed to send OTP" });
     }
};

export const loginWithOTP = async (req, res) => {
     try {
          const { email, otp } = req.body;

          if (!email || !otp) {
               return res.status(400).json({ error: "Please provide email and OTP" });
          }

          // Verify OTP
          const otpRecord = await OTP.findOne({ email });
          if (!otpRecord) {
               return res.status(400).json({ error: "No OTP request found. Please request a new OTP." });
          }

          if (otpRecord.attempts >= 3) {
               await OTP.deleteOne({ email });
               return res.status(400).json({ error: "Too many failed attempts. Please request a new OTP." });
          }

          if (otpRecord.otp !== otp) {
               otpRecord.attempts += 1;
               await otpRecord.save();
               return res.status(400).json({ error: `Invalid OTP. ${3 - otpRecord.attempts} attempts remaining.` });
          }

          // Delete OTP record after successful login
          await OTP.deleteOne({ email });

          // Find user
          const user = await User.findOne({ email });
          if (!user) {
               return res.status(404).json({ error: "User not found" });
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
          console.error("Login with OTP error:", error);
          res.status(500).json({ error: error.message });
     }
};

export const signupWithOTP = async (req, res) => {
     try {
          const { name, email, phone, otp } = req.body;

          if (!name || !email || !phone || !otp) {
               return res.status(400).json({ error: "Please fill in all fields" });
          }

          if (!/^[0-9]{10}$/.test(phone)) {
               return res.status(400).json({ error: "Please enter a valid 10-digit phone number" });
          }

          // Verify OTP
          const otpRecord = await OTP.findOne({ email });
          if (!otpRecord) {
               return res.status(400).json({ error: "No OTP request found. Please request a new OTP." });
          }

          if (otpRecord.attempts >= 3) {
               await OTP.deleteOne({ email });
               return res.status(400).json({ error: "Too many failed attempts. Please request a new OTP." });
          }

          if (otpRecord.otp !== otp) {
               otpRecord.attempts += 1;
               await otpRecord.save();
               return res.status(400).json({ error: `Invalid OTP. ${3 - otpRecord.attempts} attempts remaining.` });
          }

          // Delete OTP record
          await OTP.deleteOne({ email });

          // Check user existence
          const userExists = await User.findOne({ email });
          if (userExists) {
               return res.status(400).json({ error: "User already exists with this email" });
          }

          // Create user
          const user = await User.create({
               name,
               email,
               phone,
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
                    phone: user.phone,
               },
          });
     } catch (error) {
          console.error("Signup with OTP error:", error);
          res.status(500).json({ error: error.message });
     }
};
