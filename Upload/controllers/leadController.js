import Lead from "../models/Lead.js";
import Course from "../models/Course.js";
import { transporter } from "../config/mailer.js";

export const submitLead = async (req, res) => {
     try {
          const { name, email, phone, source, courseId } = req.body;

          if (!name || !email) {
               return res.status(400).json({ error: "Name and email are required fields." });
          }

          let courseName = "";
          let syllabusHtml = "";
          let courseObj = null;

          if (courseId) {
               try {
                    courseObj = await Course.findById(courseId);
                    if (!courseObj) {
                         courseObj = await Course.findOne({ slug: courseId });
                    }
               } catch (e) {
                    courseObj = await Course.findOne({ slug: courseId });
               }
          }

          if (!courseObj) {
               courseObj = await Course.findOne();
          }

          if (courseObj) {
               courseName = courseObj.title || courseObj.name || "";
               const chapters = courseObj.sections || courseObj.chapter || [];

               syllabusHtml = `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; rounded-2xl; overflow: hidden;">
                         <div style="background-color: #0071E5; padding: 24px; text-align: center;">
                              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">SHIKSHA</h1>
                              <p style="color: #e0f2fe; margin: 4px 0 0 0; font-size: 13px;">Professional Learning & Career Development Platform</p>
                         </div>

                         <div style="padding: 28px; color: #1f2937;">
                              <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Requested Course Syllabus</h2>
                              <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
                                   Hi <strong>${name}</strong>,<br/>
                                   Thank you for requesting the official syllabus for <strong>${courseName}</strong>. Below is the detailed curriculum breakdown:
                              </p>

                              <div style="margin: 20px 0; border-top: 1px solid #f3f4f6; pt-16;">
                                   ${Array.isArray(chapters) && chapters.length > 0 ? chapters.map((ch, idx) => `
                                        <div style="margin-bottom: 16px; padding: 14px 16px; background-color: #f9fafb; border-left: 4px solid #0071E5; border-radius: 6px;">
                                             <h4 style="margin: 0 0 8px 0; color: #111827; font-size: 15px;">Chapter ${idx + 1}: ${ch.chaptername || ch.title || "Module"}</h4>
                                             <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 13px; line-height: 1.6;">
                                                  ${(ch.lessons || []).map(l => `<li>${typeof l === 'string' ? l : (l.lessonname || l.title || '')}</li>`).join('')}
                                             </ul>
                                        </div>
                                   `).join('') : '<p style="font-size: 13px; color: #6b7280;">Detailed module information is available on our portal.</p>'}
                              </div>

                              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-top: 24px; text-align: center;">
                                   <p style="margin: 0; font-size: 13px; color: #1e40af; font-weight: 600;">Need immediate counseling or intake dates?</p>
                                   <p style="margin: 4px 0 0 0; font-size: 14px; color: #0071E5; font-weight: 700;">Call Us: +91 9911782350 / +91 9811818122</p>
                              </div>
                         </div>

                         <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af;">
                              &copy; ${new Date().getFullYear()} Shiksha Design Academy. All rights reserved.
                         </div>
                    </div>
               `;
          }

          // 1. Save Lead to MongoDB
          const lead = new Lead({
               name: name.trim(),
               email: email.trim(),
               phone: phone || "",
               source: source || "Website Lead",
               courseId: courseId || "",
               courseName: courseName || "General Website Inquiry"
          });
          await lead.save();

          // 2. Send Syllabus Email to Student (User)
          if (syllabusHtml) {
               try {
                    await transporter.sendMail({
                         from: process.env.EMAIL_FROM || '"Shiksha Academy" <pyush.anand7@gmail.com>',
                         to: email.trim(),
                         subject: `Requested Syllabus - ${courseName || "Course Curriculum"} | Shiksha`,
                         html: syllabusHtml
                    });
               } catch (emailErr) {
                    console.error("Error sending syllabus email to student:", emailErr);
               }
          }

          // 3. Send Lead Alert Email to Admin (Pyush / EMAIL_TO)
          const adminRecipient = process.env.EMAIL_TO || "pyush.anand7@gmail.com";
          try {
               await transporter.sendMail({
                    from: process.env.EMAIL_FROM || '"Shiksha Academy" <pyush.anand7@gmail.com>',
                    to: adminRecipient,
                    subject: `🎓 New Course Inquiry Lead: ${name} (${courseName || 'Website Form'})`,
                    html: `
                         <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
                              <h2 style="color: #0071E5; margin-top: 0;">🎓 New Lead Captured on Shiksha</h2>
                              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;"/>
                              <p style="font-size: 14px; margin: 8px 0;"><strong>Name:</strong> ${name}</p>
                              <p style="font-size: 14px; margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                              <p style="font-size: 14px; margin: 8px 0;"><strong>Mobile:</strong> ${phone || "Not provided"}</p>
                              <p style="font-size: 14px; margin: 8px 0;"><strong>Requested Program:</strong> ${courseName || "General Website Form"}</p>
                              <p style="font-size: 14px; margin: 8px 0;"><strong>Source:</strong> ${source || "Course Page Brochure Request"}</p>
                              <p style="font-size: 14px; margin: 8px 0;"><strong>Date/Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                         </div>
                    `
               });
          } catch (adminEmailErr) {
               console.error("Error sending alert email to admin:", adminEmailErr);
          }

          res.status(201).json({ success: true, lead });

     } catch (err) {
          console.error("Error in submitLead:", err);
          res.status(500).json({ error: err.message || "Failed to submit lead." });
     }
};
