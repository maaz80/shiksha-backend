import connectDB from "../config/db.js";
import CrmLead from "../models/CrmLead.js";
import CrmSetting from "../models/CrmSetting.js";
import Lead from "../models/Lead.js";
import WhatsAppLead from "../models/WhatsAppLead.js";
import InstagramLead from "../models/InstagramLead.js";
import {
  cleanPhoneNumber,
  calculateLeadScoreAndTags,
  getDefaultFollowUp,
  ingestUnifiedLead
} from "../services/leadService.js";

const DEFAULT_PERMISSIONS = {
  kanban: true,
  leadsTable: true,
  followups: true,
  analytics: true,
  addLead: true,
  syncDb: true,
  exportCsv: true,
  callLead: true,
  whatsapp: true,
  deleteLead: true,
  updateStatus: true,
  addNotes: true,
  scheduleFollowup: true
};

// 1. GET /api/crm/leads - Filtered & Paginated Leads
export const getLeads = async (req, res) => {
  try {
    await connectDB();
    const {
      status,
      course,
      source,
      priority,
      search,
      followUp,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (course && course !== "All") {
      query.course = { $regex: new RegExp(course.trim(), "i") };
    }

    if (source && source !== "All") {
      query.source = { $regex: new RegExp(source.trim(), "i") };
    }

    if (priority && priority !== "All") {
      query.priority = priority;
    }

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, "i");
      query.$or = [
        { name: regex },
        { phone: regex },
        { email: regex },
        { course: regex },
        { instagramUsername: regex }
      ];
    }

    // Follow-up Date Filter
    if (followUp) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      if (followUp === "today") {
        query.followUpDate = { $gte: startOfToday, $lte: endOfToday };
      } else if (followUp === "overdue") {
        query.followUpDate = { $lt: startOfToday, $ne: null };
        query.status = { $nin: ["Enrolled", "Lost"] };
      } else if (followUp === "upcoming") {
        query.followUpDate = { $gt: endOfToday };
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [leads, total] = await Promise.all([
      CrmLead.find(query)
        .sort({ lastActivityAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      CrmLead.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      leads,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 2. GET /api/crm/leads/:id - Single Lead Details
export const getLeadById = async (req, res) => {
  try {
    await connectDB();
    const lead = await CrmLead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    return res.status(200).json({ success: true, lead });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 3. POST /api/crm/leads - Manual Ingestion (Walk-in / Direct Call)
export const createLead = async (req, res) => {
  try {
    await connectDB();
    const { name, phone, email, course, source, answers, initialNote, priority } = req.body;
    if (!name && !phone) {
      return res.status(400).json({ success: false, error: "Name or Phone is required" });
    }

    const result = await ingestUnifiedLead({
      name,
      phone,
      email,
      course,
      source: source || "Manual Ingestion",
      answers: answers || {},
      initialNote: initialNote || `[Manual Lead Added]: by ${req.crmUser?.user || "Counselor"}.`
    });

    if (priority && ["Hot", "Warm", "Cold"].includes(priority)) {
      result.lead.priority = priority;
      await result.lead.save();
    }

    return res.status(201).json({
      success: true,
      lead: result.lead,
      isNew: result.isNew,
      message: result.isNew ? "Lead created successfully" : "Existing lead profile updated"
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 4. PUT /api/crm/leads/:id - Update Contact & Details
export const updateLead = async (req, res) => {
  try {
    await connectDB();
    const { name, phone, email, course, priority, assignedTo, leadScore, autoTags } = req.body;
    const lead = await CrmLead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }

    if (name) lead.name = name.trim();
    if (phone) lead.phone = phone.trim();
    if (email !== undefined) lead.email = email.trim();
    if (course) lead.course = course.trim();
    if (priority) lead.priority = priority;
    if (assignedTo) lead.assignedTo = assignedTo.trim();
    if (leadScore !== undefined) lead.leadScore = leadScore;
    if (autoTags && Array.isArray(autoTags)) lead.autoTags = autoTags;

    lead.lastActivityAt = new Date();
    await lead.save();

    return res.status(200).json({ success: true, lead, message: "Lead updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 5. PATCH /api/crm/leads/:id/status - Update Pipeline Stage
export const updateLeadStatus = async (req, res) => {
  try {
    await connectDB();
    const { status, enrollmentFee, dropReason, note } = req.body;
    const validStatuses = ["Pending", "Contacted", "In Discussion", "Demo Scheduled", "Enrolled", "Lost"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const lead = await CrmLead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }

    const oldStatus = lead.status;
    lead.status = status;
    lead.lastActivityAt = new Date();

    if (enrollmentFee !== undefined) lead.enrollmentFee = Number(enrollmentFee) || 0;
    if (dropReason !== undefined) lead.dropReason = dropReason;

    // Log to Timeline
    const author = req.crmUser?.user || "Counselor";
    let statusText = `[Stage Moved]: Changed from "${oldStatus}" to "${status}" by ${author}.`;
    if (status === "Enrolled" && enrollmentFee) {
      statusText += ` Enrollment Fee: ₹${enrollmentFee}.`;
    }
    if (status === "Lost" && dropReason) {
      statusText += ` Drop Reason: "${dropReason}".`;
    }
    if (note) {
      statusText += ` Remarks: ${note}`;
    }

    lead.notes.push({
      author,
      text: statusText,
      createdAt: new Date()
    });

    await lead.save();

    // Auto-Sync to ERP if Enrolled
    if (status === "Enrolled") {
      import("./erpStudentController.js")
        .then(({ syncSingleEnrolledLeadToErp }) => {
          if (typeof syncSingleEnrolledLeadToErp === "function") {
            syncSingleEnrolledLeadToErp(lead);
          }
        })
        .catch(() => {
          // ERP not yet installed or active — silently ignored
        });
    }

    return res.status(200).json({
      success: true,
      lead,
      message: `Lead status updated to ${status}`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 6. POST /api/crm/leads/:id/notes - Add Counselor Remark
export const addLeadNote = async (req, res) => {
  try {
    await connectDB();
    const { text, author } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: "Note text is required" });
    }

    const lead = await CrmLead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }

    const noteAuthor = author || req.crmUser?.user || "Counselor";
    const newNote = {
      author: noteAuthor,
      text: text.trim(),
      createdAt: new Date()
    };

    lead.notes.push(newNote);
    lead.lastActivityAt = new Date();
    await lead.save();

    return res.status(201).json({
      success: true,
      note: lead.notes[lead.notes.length - 1],
      lead
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 7. POST /api/crm/leads/:id/followup - Schedule Callback
export const scheduleFollowup = async (req, res) => {
  try {
    await connectDB();
    const { followUpDate, followUpTime, followUpNote } = req.body;
    if (!followUpDate) {
      return res.status(400).json({ success: false, error: "Follow-up date is required" });
    }

    const lead = await CrmLead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }

    lead.followUpDate = new Date(followUpDate);
    lead.followUpTime = followUpTime || "";
    lead.followUpNote = followUpNote || "";
    lead.lastActivityAt = new Date();

    const author = req.crmUser?.user || "Counselor";
    lead.notes.push({
      author,
      text: `[Callback Scheduled]: Date: ${new Date(followUpDate).toLocaleDateString("en-IN")}${
        followUpTime ? ` at ${followUpTime}` : ""
      }${followUpNote ? ` | Note: "${followUpNote}"` : ""}`,
      createdAt: new Date()
    });

    await lead.save();

    return res.status(200).json({
      success: true,
      lead,
      message: "Follow-up scheduled successfully"
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 8. DELETE /api/crm/leads/:id - Cascading Purge
export const deleteLead = async (req, res) => {
  try {
    await connectDB();
    const lead = await CrmLead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }

    const leadPhone = cleanPhoneNumber(lead.phone);
    const leadEmail = lead.email ? lead.email.trim().toLowerCase() : "";

    // 1. Delete CrmLead
    await CrmLead.findByIdAndDelete(req.params.id);

    // 2. Cascade delete from Lead collection if exists
    try {
      const deleteConditions = [];
      if (leadPhone && leadPhone.length >= 10) {
        deleteConditions.push({ phone: { $regex: leadPhone } });
      }
      if (leadEmail) {
        deleteConditions.push({ email: leadEmail });
      }
      if (deleteConditions.length > 0) {
        await Lead.deleteMany({ $or: deleteConditions });
      }
    } catch (e) {
      console.error("Cascade delete in Lead collection failed:", e.message);
    }

    // 3. Cascade delete in ERP if models exist
    try {
      import("./erpStudentController.js").then(({ cascadeDeleteLeadFromErp }) => {
        if (typeof cascadeDeleteLeadFromErp === "function") {
          cascadeDeleteLeadFromErp(lead);
        }
      }).catch(() => {});
    } catch {}

    return res.status(200).json({
      success: true,
      message: "Lead and linked source entries deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 9. POST /api/crm/leads/sync - One-Click Database Sync
export const syncExistingLeads = async (req, res) => {
  try {
    await connectDB();
    // Collect all existing CRM phone and email keys for fast O(1) set lookup
    const existingCrmLeads = await CrmLead.find({}, { phone: 1, email: 1, originalLeadId: 1 }).lean();
    const existingPhones = new Set();
    const existingEmails = new Set();
    const existingIds = new Set();

    for (const c of existingCrmLeads) {
      const cp = cleanPhoneNumber(c.phone);
      if (cp && cp.length >= 10) existingPhones.add(cp);
      if (c.email) existingEmails.add(c.email.trim().toLowerCase());
      if (c.originalLeadId) existingIds.add(String(c.originalLeadId));
    }

    let syncedCount = 0;

    // Scan Website Lead collection
    try {
      const rawLeads = await Lead.find({}).lean();
      for (const item of rawLeads) {
        const p = cleanPhoneNumber(item.phone);
        const em = item.email ? item.email.trim().toLowerCase() : "";
        const idStr = String(item._id);

        if (existingIds.has(idStr)) continue;
        if (p && existingPhones.has(p)) continue;
        if (em && existingEmails.has(em)) continue;

        const { score, priority, tags } = calculateLeadScoreAndTags({
          name: item.name,
          phone: p,
          email: em,
          course: item.courseName || item.courseId || "Web Development Course",
          answersSummary: "",
          source: item.source || "Website Lead",
          status: "Pending"
        });

        const { date: defaultDate, time: defaultTime } = getDefaultFollowUp();

        await CrmLead.create({
          name: item.name || "Website Lead",
          phone: p || item.phone || "Not Provided",
          email: em,
          course: item.courseName || item.courseId || "Web Development Course",
          source: item.source || "Website Lead",
          status: "Pending",
          priority,
          leadScore: score,
          autoTags: tags,
          followUpDate: defaultDate,
          followUpTime: defaultTime,
          followUpNote: "Auto-synced from database",
          originalLeadId: idStr,
          originalType: "lead",
          notes: [
            {
              author: "Sync Engine",
              text: `[Database Sync]: Synced from website inquiry records. Score: ${score}/100.`,
              createdAt: item.createdAt || new Date()
            }
          ],
          createdAt: item.createdAt || new Date(),
          lastActivityAt: item.updatedAt || item.createdAt || new Date()
        });

        if (p && p.length >= 10) existingPhones.add(p);
        if (em) existingEmails.add(em);
        existingIds.add(idStr);
        syncedCount++;
      }
    } catch (err) {
      console.warn("Website leads collection sync error:", err.message);
    }

    // Scan WhatsApp Leads collection if present
    try {
      const rawWhatsApp = await WhatsAppLead.find({}).lean();
      for (const item of rawWhatsApp) {
        const p = cleanPhoneNumber(item.phone);
        if (!p || existingPhones.has(p)) continue;

        const { score, priority, tags } = calculateLeadScoreAndTags({
          name: item.name,
          phone: p,
          email: "",
          course: item.course || "General Inquiry",
          answersSummary: item.message || "",
          source: "WhatsApp Chatbot",
          status: "Pending"
        });

        const { date: defaultDate, time: defaultTime } = getDefaultFollowUp();

        await CrmLead.create({
          name: item.name || "WhatsApp Inquirer",
          phone: p,
          course: item.course || "General Inquiry",
          source: "WhatsApp Chatbot",
          status: "Pending",
          priority,
          leadScore: score,
          autoTags: tags,
          followUpDate: defaultDate,
          followUpTime: defaultTime,
          followUpNote: "Inbound WhatsApp lead",
          originalType: "whatsapp",
          notes: [
            {
              author: "WhatsApp Bot",
              text: `[WhatsApp Message]: ${item.message || "Initiated chatbot inquiry"}.`,
              createdAt: item.createdAt || new Date()
            }
          ],
          createdAt: item.createdAt || new Date(),
          lastActivityAt: item.updatedAt || item.createdAt || new Date()
        });

        existingPhones.add(p);
        syncedCount++;
      }
    } catch {}

    const totalInCrm = await CrmLead.countDocuments();

    return res.status(200).json({
      success: true,
      syncedCount,
      totalInCrm,
      message: `Database sync completed. ${syncedCount} new leads ingested. Total leads: ${totalInCrm}`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 10. GET /api/crm/leads/analytics - KPIs, Pipeline Funnel & Sources
export const getAnalytics = async (req, res) => {
  try {
    await connectDB();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [
      totalLeads,
      todayLeads,
      pendingCount,
      contactedCount,
      discussionCount,
      demoCount,
      enrolledCount,
      lostCount,
      hotCount,
      warmCount,
      coldCount,
      followUpToday,
      followUpOverdue,
      followUpUpcoming,
      sourceAgg,
      courseAgg
    ] = await Promise.all([
      CrmLead.countDocuments(),
      CrmLead.countDocuments({ createdAt: { $gte: startOfToday } }),
      CrmLead.countDocuments({ status: "Pending" }),
      CrmLead.countDocuments({ status: "Contacted" }),
      CrmLead.countDocuments({ status: "In Discussion" }),
      CrmLead.countDocuments({ status: "Demo Scheduled" }),
      CrmLead.countDocuments({ status: "Enrolled" }),
      CrmLead.countDocuments({ status: "Lost" }),
      CrmLead.countDocuments({ priority: "Hot" }),
      CrmLead.countDocuments({ priority: "Warm" }),
      CrmLead.countDocuments({ priority: "Cold" }),
      CrmLead.countDocuments({ followUpDate: { $gte: startOfToday, $lte: endOfToday } }),
      CrmLead.countDocuments({
        followUpDate: { $lt: startOfToday, $ne: null },
        status: { $nin: ["Enrolled", "Lost"] }
      }),
      CrmLead.countDocuments({ followUpDate: { $gt: endOfToday } }),
      CrmLead.aggregate([
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      CrmLead.aggregate([
        { $group: { _id: "$course", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    const resolvedTotal = enrolledCount + lostCount;
    const conversionRate = resolvedTotal > 0
      ? Math.round((enrolledCount / resolvedTotal) * 100)
      : totalLeads > 0
      ? Math.round((enrolledCount / totalLeads) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      analytics: {
        totalLeads,
        todayLeads,
        conversionRate,
        stages: {
          Pending: pendingCount,
          Contacted: contactedCount,
          "In Discussion": discussionCount,
          "Demo Scheduled": demoCount,
          Enrolled: enrolledCount,
          Lost: lostCount
        },
        priorities: {
          Hot: hotCount,
          Warm: warmCount,
          Cold: coldCount
        },
        followUps: {
          today: followUpToday,
          overdue: followUpOverdue,
          upcoming: followUpUpcoming
        },
        sources: sourceAgg.map((s) => ({ source: s._id || "Unknown", count: s.count })),
        courses: courseAgg.map((c) => ({ course: c._id || "General", count: c.count }))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 11. GET /api/crm/leads/permissions - Feature Matrix
export const getPermissions = async (req, res) => {
  try {
    await connectDB();
    let setting = await CrmSetting.findOne({ key: "feature_permissions" });
    if (!setting) {
      setting = await CrmSetting.create({
        key: "feature_permissions",
        permissions: DEFAULT_PERMISSIONS,
        updatedBy: "system"
      });
    }

    return res.status(200).json({
      success: true,
      permissions: { ...DEFAULT_PERMISSIONS, ...setting.permissions }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 12. PUT /api/crm/leads/permissions - Update Matrix (Admin only)
export const updatePermissions = async (req, res) => {
  try {
    await connectDB();
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== "object") {
      return res.status(400).json({ success: false, error: "Permissions object required" });
    }

    let setting = await CrmSetting.findOne({ key: "feature_permissions" });
    if (!setting) {
      setting = new CrmSetting({
        key: "feature_permissions",
        permissions: { ...DEFAULT_PERMISSIONS, ...permissions },
        updatedBy: req.crmUser?.user || "admin"
      });
    } else {
      setting.permissions = { ...setting.permissions, ...permissions };
      setting.updatedBy = req.crmUser?.user || "admin";
    }

    await setting.save();

    return res.status(200).json({
      success: true,
      permissions: setting.permissions,
      message: "Permissions updated successfully"
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
