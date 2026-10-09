import connectDB from "../config/db.js";
import CrmLead from "../models/CrmLead.js";

// Clean 10-digit Indian phone number
export const cleanPhoneNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

// Calculate Lead Score & Priority
export function calculateLeadScoreAndTags({ name, phone, email, course, answersSummary, source, status }) {
  let score = 40;
  const tags = [];

  const cleanPhone = cleanPhoneNumber(phone);
  if (cleanPhone && cleanPhone.length === 10) {
    score += 20; // Verified phone has highest value
  }

  if (email && email.includes("@") && email !== "Not provided") {
    score += 15;
    tags.push("Email Verified");
  }

  if (course && course !== "General Inquiry") {
    score += 15;
    const firstWord = course.split(" ")[0];
    if (firstWord) tags.push(firstWord);
  }

  if (answersSummary && answersSummary.length > 15) {
    score += 10;
    const lowerSummary = answersSummary.toLowerCase();
    if (lowerSummary.includes("1-on-1") || lowerSummary.includes("flexible")) {
      tags.push("1-on-1 Mentorship");
    }
    if (lowerSummary.includes("weekend")) {
      tags.push("Weekend Live");
    }
  }

  const lowerSource = (source || "").toLowerCase();
  if (lowerSource.includes("whatsapp")) {
    tags.push("WhatsApp Lead");
  } else if (lowerSource.includes("instagram")) {
    tags.push("Instagram Lead");
  } else if (lowerSource.includes("popup")) {
    tags.push("Website Popup");
  } else if (lowerSource.includes("brochure") || lowerSource.includes("syllabus")) {
    tags.push("Brochure Download");
  } else if (lowerSource.includes("chatbot")) {
    tags.push("Chatbot Lead");
  }

  if (status === "human_handover" || status === "qualified") {
    score += 15;
    tags.push("Counselor Requested");
  }

  score = Math.min(Math.max(score, 10), 100);

  let priority = "Warm";
  if (score >= 75) {
    priority = "Hot";
    tags.unshift("🔥 Hot Prospect");
  } else if (score < 50) {
    priority = "Cold";
  } else {
    tags.unshift("⚡ Warm Lead");
  }

  return { score, priority, tags: Array.from(new Set(tags)) };
}

// Default 2-hour callback window
export function getDefaultFollowUp() {
  const now = new Date();
  const followUp = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const timeStr = followUp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return { date: followUp, time: timeStr };
}

// Unified Ingestion Function
export async function ingestUnifiedLead({
  name,
  phone,
  email,
  course,
  source = "Website Lead",
  answers = {},
  answersSummary = "",
  initialNote = ""
}) {
  await connectDB();
  const cleanPhone = cleanPhoneNumber(phone);
  const trimmedEmail = email ? email.trim().toLowerCase() : "";
  const leadName = name ? name.trim() : "Website Visitor";
  const courseName = course || answers?.course || "Web Development Course";

  let formattedSummary = answersSummary;
  if (!formattedSummary && answers && typeof answers === "object") {
    formattedSummary = Object.entries(answers)
      .filter(([k]) => !["name", "email", "phone"].includes(k))
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
      .join(" | ");
  }

  const { score, priority, tags } = calculateLeadScoreAndTags({
    name: leadName,
    phone: cleanPhone,
    email: trimmedEmail,
    course: courseName,
    answersSummary: formattedSummary,
    source,
    status: "Pending"
  });

  // Duplicate Check
  const searchConditions = [];
  if (cleanPhone && cleanPhone.length >= 10) {
    searchConditions.push({ phone: { $regex: cleanPhone } });
  }
  if (trimmedEmail && trimmedEmail.includes("@")) {
    searchConditions.push({ email: trimmedEmail });
  }

  let existingLead = searchConditions.length > 0 ? await CrmLead.findOne({ $or: searchConditions }) : null;

  if (existingLead) {
    existingLead.lastActivityAt = new Date();
    if (leadName && leadName !== "Website Visitor") {
      existingLead.name = leadName;
    }
    if (source) {
      existingLead.source = source;
    }
    if (courseName && courseName !== "General Inquiry") existingLead.course = courseName;
    if (answers && Object.keys(answers).length > 0) existingLead.answers = { ...existingLead.answers, ...answers };
    if (formattedSummary) existingLead.answersSummary = formattedSummary;
    if (score > (existingLead.leadScore || 0)) {
      existingLead.leadScore = score;
      existingLead.priority = priority;
    }
    if (!existingLead.autoTags.includes("Re-Inquiry")) {
      existingLead.autoTags.push("Re-Inquiry");
    }
    existingLead.notes.push({
      author: "System Bot",
      text: initialNote || `[Re-Inquiry via ${source}]: Course: "${courseName}".`,
      createdAt: new Date()
    });
    await existingLead.save();
    return { lead: existingLead, isNew: false };
  }

  const { date: defaultDate, time: defaultTime } = getDefaultFollowUp();
  const newLead = await CrmLead.create({
    name: leadName,
    phone: cleanPhone || phone || "Not Provided",
    email: trimmedEmail,
    course: courseName,
    source,
    status: "Pending",
    priority,
    leadScore: score,
    autoTags: tags,
    followUpDate: defaultDate,
    followUpTime: defaultTime,
    followUpNote: "Auto-assigned callback window",
    answers: answers || {},
    answersSummary: formattedSummary,
    notes: [
      {
        author: "System Bot",
        text: initialNote || `[Lead Captured]: Submitted via ${source}. Score: ${score}/100 (${priority}).`,
        createdAt: new Date()
      }
    ],
    createdAt: new Date(),
    lastActivityAt: new Date()
  });

  return { lead: newLead, isNew: true };
}
