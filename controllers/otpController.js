import { generateAndSendOTP, verifyOTP } from "../services/otpService.js";
import { transporter } from "../config/mailer.js";

export const sendOTP = async (req, res) => {
     try {
          const { phone, email } = req.body;

          // console.log("📩 Send OTP request:", { phone, email });

          if (!phone || !/^[0-9]{10}$/.test(phone)) {
               return res.status(400).json({ error: "Valid 10-digit phone number is required" });
          }

          if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
               return res.status(400).json({ error: "Valid email address is required" });
          }

          const result = await generateAndSendOTP(phone, email);
          res.json(result);
     } catch (error) {
          console.error("Send OTP error:", error);
          res.status(500).json({ error: error.message || "Failed to send OTP" });
     }
};

export const verifyOTPAndSubmit = async (req, res) => {
     try {
          const { fullName, phone, email, message, otp } = req.body;

          // console.log("✅ Verify OTP request:", { phone, email, otp });

          // Verify OTP
          const verification = await verifyOTP(phone, otp);

          if (!verification.success) {
               return res.status(400).json({ error: verification.message });
          }

          // ✅ Send Booking Email (Original working code)
          await transporter.sendMail({
               from: process.env.EMAIL_FROM,
               to: process.env.EMAIL_TO,
               subject: "New Booking Request - Kreeya",
               html: `
                    <h2>New Booking Request (Verified)</h2>
                    <table border="1" style="border-collapse:collapse">
                          <tr>
                               <th style="padding: 8px;">Full Name</th>
                               <td style="padding: 8px;">${fullName}</td>
                          </tr>
                          <tr>
                               <th style="padding: 8px;">Phone</th>
                               <td style="padding: 8px;">${phone}</td>
                          </tr>
                          <tr>
                               <th style="padding: 8px;">Email</th>
                               <td style="padding: 8px;">${email}</td>
                          </tr>
                          <tr>
                               <th style="padding: 8px;">Message</th>
                               <td style="padding: 8px;">${message || "N/A"}</td>
                          </tr>
                          <tr>
                               <th style="padding: 8px;">Verified At</th>
                               <td style="padding: 8px;">${new Date().toISOString()}</td>
                          </tr>
                    </table>
               `
          });

          console.log(`✅ Booking email sent to admin for: ${email}`);

          // Delete OTP record after successful submission
          const OTP = await import("../models/otpModel.js");
          await OTP.default.deleteOne({ phone });

          res.json({ success: true, message: "Booking submitted successfully!" });
     } catch (error) {
          console.error("Submit booking error:", error);
          res.status(500).json({ error: error.message || "Failed to submit booking" });
     }
};