import { transporter } from "../config/mailer.js";
import User from "../models/User.js";
import Course from "../models/Course.js";

/**
 * Helper to fetch Zoom OAuth Access Token via Server-to-Server OAuth
 */
async function getZoomAccessToken() {
     const accountId = process.env.ZOOM_ACCOUNT_ID;
     const clientId = process.env.ZOOM_CLIENT_ID;
     const clientSecret = process.env.ZOOM_CLIENT_SECRET;

     if (!accountId || !clientId || !clientSecret) return null;

     try {
          const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
          const tokenRes = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
               method: "POST",
               headers: {
                    "Authorization": `Basic ${authHeader}`,
                    "Content-Type": "application/x-www-form-urlencoded"
               }
          });

          const tokenData = await tokenRes.json();
          return tokenData.access_token || null;
     } catch (err) {
          console.error("Zoom OAuth error:", err.message);
          return null;
     }
}

/**
 * Forcefully End Active Zoom Cloud Meeting
 */
async function forceEndZoomMeeting(meetingId, accessToken) {
     if (!accessToken || !meetingId) return false;
     let ended = false;

     try {
          const cleanId = meetingId.toString().replace(/\s+/g, "");
          const res = await fetch(`https://api.zoom.us/v2/meetings/${cleanId}/status`, {
               method: "PUT",
               headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
               },
               body: JSON.stringify({ action: "end" })
          });
          if (res.ok || res.status === 204) ended = true;
     } catch (e) {
          console.log("Notice ending meeting by ID:", e.message);
     }
     return ended;
}

/**
 * 1-Click Auto Generate Real Zoom Meeting via API
 */
export const createZoomMeetingApi = async (req, res) => {
     try {
          const { topic = "Live Interactive Class" } = req.body || {};

          const accessToken = await getZoomAccessToken();
          if (!accessToken) {
               return res.json({
                    success: false,
                    needCredentials: true,
                    message: "Zoom API Keys missing in backend .env. Configure ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET."
               });
          }

          // Create New Meeting via Zoom Cloud API
          const meetingRes = await fetch("https://api.zoom.us/v2/users/me/meetings", {
               method: "POST",
               headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
               },
               body: JSON.stringify({
                    topic,
                    type: 2, // Scheduled meeting
                    settings: {
                         host_video: true,
                         participant_video: true,
                         auto_recording: "cloud", // Auto record to Zoom cloud
                         waiting_room: false,
                         join_before_host: true,
                         jbh_time: 0
                    }
               })
          });

          const meetingData = await meetingRes.json();
          if (!meetingData.join_url) {
               return res.status(400).json({
                    success: false,
                    error: meetingData.message || "Failed to create Zoom meeting"
               });
          }

          return res.json({
               success: true,
               meetUrl: meetingData.join_url,
               startUrl: meetingData.start_url || meetingData.join_url,
               zoomMeetingId: meetingData.id?.toString() || "",
               passcode: meetingData.password || ""
          });
     } catch (err) {
          return res.status(500).json({ success: false, error: err.message });
     }
};

/**
 * Dispatch Zoom Meeting to Enrolled Students via Email + Save to Course Document
 */
export const sendCourseMeetLink = async (req, res) => {
     try {
          const {
               courseId,
               courseSlug,
               courseTitle,
               meetUrl,
               startUrl = "",
               zoomMeetingId = "",
               passcode = "",
               title,
               scheduledAt,
               instructions,
               saveToCourse = true
          } = req.body || {};

          if (!meetUrl) return res.status(400).json({ error: "Zoom Meeting URL is required" });

          const livePayload = (cTitle) => ({
               platform: "zoom",
               meetUrl,
               startUrl: startUrl || meetUrl,
               zoomMeetingId,
               passcode,
               title: title || `Live Zoom Session: ${cTitle || "Class"}`,
               scheduledAt: scheduledAt || "Live Now",
               instructions: instructions || "",
               active: true,
               updatedAt: new Date()
          });

          // Save Active Live Class state on Course
          if (saveToCourse) {
               if (courseId === "ALL" || (!courseId && !courseSlug)) {
                    await Course.updateMany({}, { $set: { liveClass: livePayload(courseTitle) } });
               } else {
                    let query = {};
                    if (courseId) query._id = courseId;
                    else if (courseSlug) query.slug = courseSlug;

                    const targetCourse = await Course.findOne(query);
                    if (targetCourse) {
                         targetCourse.liveClass = livePayload(targetCourse.title);
                         await targetCourse.save();
                    }
               }
          }

          // Fetch Enrolled Students for the target course
          let targetUsers = [];
          if (courseId && courseId !== "ALL") {
               targetUsers = await User.find({
                    $or: [
                         { "enrolledCourses.courseId": courseId },
                         { "enrolledCourses.courseSlug": courseSlug }
                    ]
               }).select("name email").lean();
          } else if (courseSlug) {
               targetUsers = await User.find({ "enrolledCourses.courseSlug": courseSlug }).select("name email").lean();
          } else {
               // Global dispatch: fetch all users
               targetUsers = await User.find({}).select("name email").lean();
          }

          // Dispatch HTML Invites
          const emailPromises = targetUsers.map(user => {
               const htmlBody = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; background: #f4f4f4;">
                         <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                              <h2 style="color: #2D8CFF; margin-top: 0;">🔵 Live Zoom Class Invitation</h2>
                              <p>Hello <strong>${user.name || "Student"}</strong>,</p>
                              <p>You are invited to join an exclusive live interactive Zoom class for <strong>${courseTitle || "your course"}</strong>.</p>
                              <p><strong>Topic:</strong> ${title || "Live Session"}</p>
                              ${zoomMeetingId ? `<p><strong>Meeting ID:</strong> ${zoomMeetingId}</p>` : ''}
                              ${passcode ? `<p><strong>Passcode:</strong> ${passcode}</p>` : ''}
                              ${scheduledAt ? `<p><strong>Time:</strong> ${scheduledAt}</p>` : ''}
                              ${instructions ? `<p><strong>Instructions:</strong> ${instructions}</p>` : ''}
                              <div style="margin: 24px 0;">
                                   <a href="${meetUrl}" style="display:inline-block; padding: 12px 24px; background: #2D8CFF; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: bold;">
                                        Join Zoom Meeting
                                   </a>
                              </div>
                         </div>
                    </div>
               `;

               return transporter.sendMail({
                    from: `"Shiksha Live" <${process.env.SMTP_USER || "info@weekendux.in"}>`,
                    to: user.email,
                    subject: `🔵 Live Zoom Class Invitation: ${title || courseTitle || "Live Session"}`,
                    html: htmlBody
               }).catch((err) => {
                    console.error("Email send error for", user.email, err.message);
                    return null;
               });
          });

          const results = await Promise.all(emailPromises);
          const successCount = results.filter(Boolean).length;

          return res.json({
               success: true,
               message: `Zoom link emailed to ${successCount} enrolled students!`,
               sentCount: successCount
          });
     } catch (error) {
          return res.status(500).json({ error: error.message });
     }
};

/**
 * End Live Class & Sync Cloud Recording
 */
export const clearCourseLiveClass = async (req, res) => {
     try {
          const { courseId, courseSlug } = req.body || {};
          const zoomToken = await getZoomAccessToken();

          let query = {};
          if (courseId && courseId !== "ALL") query._id = courseId;
          else if (courseSlug) query.slug = courseSlug;

          const targetCourses = (courseId === "ALL" || (!courseId && !courseSlug))
               ? await Course.find({})
               : await Course.find(query);

          for (const targetCourse of targetCourses) {
               if (targetCourse && targetCourse.liveClass) {
                    let meetingId = targetCourse.liveClass.zoomMeetingId;

                    // 1. Force end in Zoom Cloud
                    if (zoomToken && meetingId) {
                         await forceEndZoomMeeting(meetingId, zoomToken);
                    }

                    // 2. Fetch completed cloud recording URL
                    if (meetingId && zoomToken) {
                         try {
                              const recRes = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
                                   headers: { "Authorization": `Bearer ${zoomToken}` }
                              });
                              const recData = await recRes.json();
                              const videoFile = recData.recording_files?.find(f => f.file_type === "MP4");
                              if (videoFile) {
                                   if (!targetCourse.recordings) targetCourse.recordings = [];
                                   targetCourse.recordings.push({
                                        id: videoFile.id,
                                        title: recData.topic || "Live Class Recording",
                                        videoUrl: videoFile.play_url || videoFile.download_url,
                                        duration: `${recData.duration || 45} mins`,
                                        meetingId,
                                        createdAt: new Date()
                                   });
                              }
                         } catch (e) {
                              console.log("Recording sync notice:", e.message);
                         }
                    }

                    // 3. Deactivate live status
                    targetCourse.liveClass.active = false;
                    await targetCourse.save();
               }
          }

          return res.json({ success: true, message: "Live Zoom session ended and recording synced." });
     } catch (error) {
          return res.status(500).json({ error: error.message });
     }
};

/**
 * Sync Cloud Recordings for Active or Past Meetings
 */
export const syncZoomRecordings = async (req, res) => {
     try {
          const zoomToken = await getZoomAccessToken();
          if (!zoomToken) {
               return res.json({
                    success: false,
                    message: "Zoom API credentials missing in backend .env."
               });
          }

          const courses = await Course.find({});
          let totalSynced = 0;

          for (const course of courses) {
               if (course.liveClass && course.liveClass.zoomMeetingId) {
                    const meetingId = course.liveClass.zoomMeetingId;
                    try {
                         const recRes = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
                              headers: { "Authorization": `Bearer ${zoomToken}` }
                         });
                         const recData = await recRes.json();
                         if (recData && recData.recording_files && recData.recording_files.length > 0) {
                              const videoFile = recData.recording_files.find(f => f.file_type === "MP4") || recData.recording_files[0];
                              if (videoFile) {
                                   if (!course.recordings) course.recordings = [];
                                   const videoUrl = videoFile.play_url || videoFile.download_url;
                                   const exists = course.recordings.some(r => r.id === videoFile.id || r.videoUrl === videoUrl);
                                   if (!exists) {
                                        course.recordings.push({
                                             id: videoFile.id || Date.now().toString(),
                                             title: recData.topic || `${course.title} - Live Class Recording`,
                                             videoUrl,
                                             downloadUrl: videoFile.download_url || videoFile.play_url,
                                             duration: recData.duration ? `${recData.duration} mins` : "Session",
                                             meetingId: meetingId.toString(),
                                             createdAt: new Date()
                                        });
                                        totalSynced++;
                                        await course.save();
                                   }
                              }
                         }
                    } catch (e) {
                         console.log("Recording sync notice:", e.message);
                    }
               }
          }

          return res.json({
               success: true,
               message: `Successfully synced ${totalSynced} cloud recordings from Zoom.`,
               syncedCount: totalSynced
          });
     } catch (error) {
          return res.status(500).json({ error: error.message });
     }
};
