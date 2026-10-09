import connectDB from "../config/db.js";
import ErpStudent from "../models/ErpStudent.js";
import ErpBatch from "../models/ErpBatch.js";
import ErpPayment from "../models/ErpPayment.js";
import ErpAttendance from "../models/ErpAttendance.js";
import CrmLead from "../models/CrmLead.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import { generateReceiptNo } from "./erpPaymentController.js";

// Clean 10-digit Indian phone
const cleanDigits = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

// 1. Generate Unique Student ID: SHIKSHA-2026-001
export const generateStudentId = async () => {
  await connectDB();
  const currentYear = new Date().getFullYear();
  const prefix = `SHIKSHA-${currentYear}-`;
  
  // Find all student IDs with this year's prefix
  const existingStudents = await ErpStudent.find(
    { studentId: { $regex: `^${prefix}\\d+$` } },
    { studentId: 1 }
  ).lean();

  let maxNum = 0;
  for (const s of existingStudents) {
    if (s.studentId) {
      const parts = s.studentId.split("-");
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let nextSeq = maxNum + 1;
  let candidateId = `${prefix}${String(nextSeq).padStart(3, "0")}`;

  // Double check uniqueness
  while (await ErpStudent.exists({ studentId: candidateId })) {
    nextSeq++;
    candidateId = `${prefix}${String(nextSeq).padStart(3, "0")}`;
  }

  return candidateId;
};

// 2. LMS Website User Synchronization (Syncs unlocked course to student's user account)
export const syncCourseToUserLms = async ({ name, email, phone, courseId, courseSlug, courseTitle }) => {
  if (!email || !email.includes("@")) return null;
  const studentEmail = email.trim().toLowerCase();

  let user = await User.findOne({ email: studentEmail });
  if (!user) {
    const studentPhone = cleanDigits(phone);
    const defaultPass = "Shiksha@" + (studentPhone.length >= 4 ? studentPhone.slice(-4) : "1234");
    user = new User({
      name: name || "Student",
      email: studentEmail,
      password: defaultPass,
      phone: studentPhone,
      enrolledCourses: []
    });
  }

  if (!user.enrolledCourses) user.enrolledCourses = [];

  const alreadyEnrolled = user.enrolledCourses.some(
    (c) =>
      c.courseId?.toString() === courseId?.toString() ||
      (courseSlug && c.courseSlug === courseSlug)
  );

  if (!alreadyEnrolled) {
    user.enrolledCourses.push({
      courseId: courseId ? courseId.toString() : "",
      courseSlug: courseSlug || "",
      enrolledAt: new Date(),
      progress: 0,
      completedLessons: []
    });
    await user.save();
  }

  return user;
};

// 3. Unlock Course For Student on Website LMS & Adjust Fee Ledger
export const unlockCourseForStudent = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { courseId, unlockedBy = "ERP Counselor" } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, error: "Course ID is required" });
    }

    const student = await ErpStudent.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    // Find course from Course model
    let targetCourse = await Course.findById(courseId).lean();
    if (!targetCourse) {
      targetCourse = await Course.findOne({ slug: courseId }).lean();
    }

    if (!targetCourse) {
      return res.status(404).json({ success: false, error: "Target course not found in catalog" });
    }

    const targetCourseId = targetCourse._id.toString();
    const courseTitle = targetCourse.title || targetCourse.name || "LMS Video Program";
    const courseSlug = targetCourse.slug || "";
    const coursePrice = Number(targetCourse.fees || targetCourse.price || 5000) || 5000;

    // Check if already unlocked
    const alreadyUnlocked = (student.unlockedCourses || []).some(
      (u) => u.courseId === targetCourseId || (courseSlug && u.courseSlug === courseSlug)
    );

    if (alreadyUnlocked) {
      return res.status(400).json({ success: false, error: "This course is already unlocked for this student" });
    }

    if (!student.unlockedCourses) student.unlockedCourses = [];
    student.unlockedCourses.push({
      courseId: targetCourseId,
      courseTitle,
      courseSlug,
      price: coursePrice,
      unlockedAt: new Date(),
      unlockedBy
    });

    // Add to fee ledger
    student.feeDetails.totalFee = (Number(student.feeDetails.totalFee) || 0) + coursePrice;

    student.notes.unshift({
      text: `LMS Course Access Unlocked: "${courseTitle}" (+₹${coursePrice.toLocaleString("en-IN")} added to Fee Ledger).`,
      author: unlockedBy,
      createdAt: new Date()
    });

    await student.save();

    // Sync to website LMS account
    try {
      await syncCourseToUserLms({
        name: student.name,
        email: student.email,
        phone: student.phone,
        courseId: targetCourseId,
        courseSlug,
        courseTitle
      });
    } catch (syncErr) {
      console.warn("LMS user account sync warning:", syncErr.message);
    }

    return res.status(200).json({
      success: true,
      student,
      message: `"${courseTitle}" unlocked on LMS and ₹${coursePrice.toLocaleString("en-IN")} added to fee ledger`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Revoke Course For Student on Website LMS & Deduct from Ledger
export const revokeCourseForStudent = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { courseId, revokedBy = "ERP Counselor" } = req.body;

    const student = await ErpStudent.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    const item = (student.unlockedCourses || []).find((u) => u.courseId === courseId);
    if (!item) {
      return res.status(404).json({ success: false, error: "Course not found in student unlocked list" });
    }

    const price = item.price || 0;
    const courseTitle = item.courseTitle || "Course";

    student.unlockedCourses = student.unlockedCourses.filter((u) => u.courseId !== courseId);
    student.feeDetails.totalFee = Math.max(0, (Number(student.feeDetails.totalFee) || 0) - price);

    student.notes.unshift({
      text: `LMS Course Access Revoked: "${courseTitle}" (-₹${price.toLocaleString("en-IN")} deducted from Fee Ledger).`,
      author: revokedBy,
      createdAt: new Date()
    });

    await student.save();

    // Remove from website LMS User account
    if (student.email) {
      try {
        const user = await User.findOne({ email: student.email.trim().toLowerCase() });
        if (user && user.enrolledCourses) {
          user.enrolledCourses = user.enrolledCourses.filter(
            (c) => c.courseId?.toString() !== courseId && c.courseSlug !== item.courseSlug
          );
          await user.save();
        }
      } catch {}
    }

    return res.status(200).json({
      success: true,
      student,
      message: `"${courseTitle}" revoked from LMS and ₹${price.toLocaleString("en-IN")} deducted from ledger`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 5. CRM Auto-Sync Hook (Triggered when lead is marked "Enrolled" in CRM)
export const syncSingleEnrolledLeadToErp = async (crmLead) => {
  try {
    await connectDB();
    if (!crmLead) return null;

    const cleanPhone = cleanDigits(crmLead.phone);
    const email = crmLead.email ? crmLead.email.trim().toLowerCase() : "";

    // Check if already in ERP
    const conditions = [];
    if (crmLead._id) conditions.push({ crmLeadId: crmLead._id });
    if (cleanPhone && cleanPhone.length >= 10) conditions.push({ phone: { $regex: cleanPhone } });
    if (email && email.includes("@")) conditions.push({ email });

    let existingStudent = conditions.length > 0 ? await ErpStudent.findOne({ $or: conditions }) : null;

    if (existingStudent) {
      if (!existingStudent.crmLeadId && crmLead._id) {
        existingStudent.crmLeadId = crmLead._id;
        await existingStudent.save();
      }
      return existingStudent;
    }

    // Generate unique ID
    const studentId = await generateStudentId();
    const enrolledFee = Number(crmLead.enrollmentFee) || 0;
    const defaultTotalFee = 45000;

    const student = await ErpStudent.create({
      studentId,
      name: crmLead.name || "Enrolled Student",
      phone: cleanPhone || crmLead.phone || "Not Provided",
      email: email,
      course: crmLead.course || "Web Development Course in Delhi",
      crmLeadId: crmLead._id || null,
      enrollmentDate: new Date(),
      status: "Active",
      feeDetails: {
        totalFee: defaultTotalFee,
        discount: 0,
        finalFee: defaultTotalFee,
        paidAmount: enrolledFee,
        balance: Math.max(0, defaultTotalFee - enrolledFee),
        paymentStatus: enrolledFee >= defaultTotalFee ? "Paid" : enrolledFee > 0 ? "Partial" : "Pending"
      },
      notes: [
        {
          text: `[Auto-Enrolled from CRM]: Lead converted with status "Enrolled". Source: ${crmLead.source || "CRM"}.${
            enrolledFee > 0 ? ` Initial fee paid: ₹${enrolledFee}.` : ""
          }`,
          author: "CRM Sync Bridge",
          createdAt: new Date()
        }
      ]
    });

    // Create payment receipt if initial fee was paid
    if (enrolledFee > 0) {
      try {
        const receiptNo = await generateReceiptNo();
        await ErpPayment.create({
          receiptNo,
          student: student._id,
          amount: enrolledFee,
          paymentMode: "UPI",
          notes: "Initial enrollment deposit via CRM sync",
          receivedBy: "CRM Auto-Sync",
          paymentDate: new Date()
        });
      } catch (payErr) {
        console.error("Error creating initial payment receipt:", payErr.message);
      }
    }

    console.log(`✅ [ERP] Student ${student.studentId} (${student.name}) auto-synced from CRM.`);
    return student;
  } catch (err) {
    console.error("Error in syncSingleEnrolledLeadToErp:", err.message);
    return null;
  }
};

// 6. Cascading Delete Hook from CRM
export const cascadeDeleteLeadFromErp = async (crmLead) => {
  try {
    await connectDB();
    if (!crmLead) return;

    const cleanPhone = cleanDigits(crmLead.phone);
    const email = crmLead.email ? crmLead.email.trim().toLowerCase() : "";

    const conditions = [];
    if (crmLead._id) conditions.push({ crmLeadId: crmLead._id });
    if (cleanPhone && cleanPhone.length >= 10) conditions.push({ phone: { $regex: cleanPhone } });
    if (email && email.includes("@")) conditions.push({ email });

    if (conditions.length > 0) {
      const student = await ErpStudent.findOne({ $or: conditions });
      if (student) {
        await ErpPayment.deleteMany({ student: student._id });
        await ErpStudent.findByIdAndDelete(student._id);
        console.log(`🗑️ [ERP] Student ${student.studentId} cascade-deleted from CRM.`);
      }
    }
  } catch (err) {
    console.error("Error in cascadeDeleteLeadFromErp:", err.message);
  }
};

// 7. POST /api/erp/crm-import - 1-Click Bulk Import of Enrolled CRM Leads
export const importWonCrmLeads = async (req, res) => {
  try {
    await connectDB();
    const enrolledLeads = await CrmLead.find({ status: "Enrolled" }).lean();
    let importedCount = 0;

    for (const lead of enrolledLeads) {
      const cleanPhone = cleanDigits(lead.phone);
      const email = lead.email ? lead.email.trim().toLowerCase() : "";

      const conditions = [];
      if (lead._id) conditions.push({ crmLeadId: lead._id });
      if (cleanPhone && cleanPhone.length >= 10) conditions.push({ phone: { $regex: cleanPhone } });
      if (email && email.includes("@")) conditions.push({ email });

      const existing = conditions.length > 0 ? await ErpStudent.findOne({ $or: conditions }) : null;
      if (!existing) {
        await syncSingleEnrolledLeadToErp(lead);
        importedCount++;
      }
    }

    const totalStudents = await ErpStudent.countDocuments();
    return res.status(200).json({
      success: true,
      importedCount,
      totalStudents,
      message: `CRM import completed. ${importedCount} enrolled student(s) added to ERP. Total students: ${totalStudents}`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 8. GET /api/erp/students - Filtered & Paginated Directory
export const getStudents = async (req, res) => {
  try {
    await connectDB();
    const { batch, course, status, feeStatus, search, page = 1, limit = 50 } = req.query;

    const query = {};

    if (batch && batch !== "All") query.batch = batch;
    if (course && course !== "All") query.course = { $regex: new RegExp(course.trim(), "i") };
    if (status && status !== "All") query.status = status;
    if (feeStatus && feeStatus !== "All") query["feeDetails.paymentStatus"] = feeStatus;

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, "i");
      query.$or = [
        { name: regex },
        { studentId: regex },
        { phone: regex },
        { email: regex },
        { rollNumber: regex },
        { course: regex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [students, total] = await Promise.all([
      ErpStudent.find(query)
        .populate("batch", "name batchCode schedule mentorName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ErpStudent.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      students,
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

// 9. GET /api/erp/students/:id - Full Profile (Receipts, Duplicates, Attendance)
export const getStudentById = async (req, res) => {
  try {
    await connectDB();
    const student = await ErpStudent.findById(req.params.id)
      .populate("batch", "name batchCode schedule mentorName meetingLink")
      .lean();

    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    // Payment receipts
    const payments = await ErpPayment.find({ student: student._id })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    // Check for duplicate accounts by phone or email
    const cleanPhone = cleanDigits(student.phone);
    const dupConditions = [{ _id: { $ne: student._id } }];
    const subCond = [];
    if (cleanPhone && cleanPhone.length >= 10) subCond.push({ phone: { $regex: cleanPhone } });
    if (student.email && student.email.includes("@")) subCond.push({ email: student.email.trim().toLowerCase() });

    let duplicateStudents = [];
    if (subCond.length > 0) {
      duplicateStudents = await ErpStudent.find({
        $and: [dupConditions[0], { $or: subCond }]
      })
        .select("name studentId phone email course status enrollmentDate")
        .lean();
    }

    // Recent session attendance records
    let recentAttendance = [];
    if (student.batch?._id) {
      const pastSessions = await ErpAttendance.find({
        batch: student.batch._id,
        "records.student": student._id
      })
        .sort({ date: -1 })
        .limit(10)
        .lean();

      recentAttendance = pastSessions.map((s) => {
        const myRec = (s.records || []).find((r) => r.student?.toString() === student._id.toString());
        return {
          dateStr: s.dateStr,
          topic: s.topic,
          status: myRec?.status || "Absent",
          remarks: myRec?.remarks || ""
        };
      });
    }

    return res.status(200).json({
      success: true,
      student: {
        ...student,
        payments,
        duplicateStudents,
        recentAttendance
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 10. POST /api/erp/students - Manual Admission Modal
export const createStudent = async (req, res) => {
  try {
    await connectDB();
    const {
      name,
      phone,
      email,
      course,
      batchId,
      totalFee = 45000,
      discount = 0,
      paidAmount = 0,
      paymentMode = "UPI",
      transactionId = "",
      notes = "",
      rollNumber = "",
      education = "",
      address = ""
    } = req.body;

    if (!name || !phone || !course) {
      return res.status(400).json({ success: false, error: "Name, phone, and course program are required" });
    }

    const studentId = await generateStudentId();
    const cleanPhone = cleanDigits(phone);
    const initialPaid = Number(paidAmount) || 0;
    const initialTotal = Number(totalFee) || 45000;
    const initialDisc = Number(discount) || 0;

    const student = await ErpStudent.create({
      studentId,
      name: name.trim(),
      phone: cleanPhone || phone.trim(),
      email: email ? email.trim().toLowerCase() : "",
      course: course.trim(),
      batch: batchId || null,
      rollNumber: rollNumber.trim(),
      education: education.trim(),
      address: address.trim(),
      status: "Active",
      feeDetails: {
        totalFee: initialTotal,
        discount: initialDisc,
        finalFee: Math.max(0, initialTotal - initialDisc),
        paidAmount: initialPaid,
        balance: Math.max(0, initialTotal - initialDisc - initialPaid),
        paymentStatus:
          initialPaid >= initialTotal - initialDisc ? "Paid" : initialPaid > 0 ? "Partial" : "Pending"
      },
      notes: notes
        ? [
            {
              text: `[Manual Admission]: ${notes.trim()}`,
              author: req.erpUser?.user || "Admin",
              createdAt: new Date()
            }
          ]
        : []
    });

    // Create payment receipt if paidAmount > 0
    if (initialPaid > 0) {
      try {
        const receiptNo = await generateReceiptNo();
        await ErpPayment.create({
          receiptNo,
          student: student._id,
          amount: initialPaid,
          paymentMode,
          transactionId: transactionId.trim(),
          notes: "Initial admission payment",
          receivedBy: req.erpUser?.user || "Admin",
          paymentDate: new Date()
        });
      } catch (e) {
        console.error("Initial receipt creation error:", e.message);
      }
    }

    return res.status(201).json({
      success: true,
      student,
      message: `Student enrolled successfully with ID: ${student.studentId}`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 11. PUT /api/erp/students/:id - Update Student
export const updateStudent = async (req, res) => {
  try {
    await connectDB();
    const student = await ErpStudent.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    const {
      name,
      phone,
      email,
      course,
      batchId,
      status,
      rollNumber,
      education,
      address,
      totalFee,
      discount,
      paidAmount,
      emergencyContact
    } = req.body;

    if (name) student.name = name.trim();
    if (phone) student.phone = cleanDigits(phone) || phone.trim();
    if (email !== undefined) student.email = email.trim().toLowerCase();
    if (course) student.course = course.trim();
    if (batchId !== undefined) student.batch = batchId || null;
    if (status) student.status = status;
    if (rollNumber !== undefined) student.rollNumber = rollNumber.trim();
    if (education !== undefined) student.education = education.trim();
    if (address !== undefined) student.address = address.trim();
    if (emergencyContact) student.emergencyContact = emergencyContact;

    if (totalFee !== undefined) student.feeDetails.totalFee = Number(totalFee) || 0;
    if (discount !== undefined) student.feeDetails.discount = Number(discount) || 0;
    if (paidAmount !== undefined) student.feeDetails.paidAmount = Number(paidAmount) || 0;

    await student.save();

    return res.status(200).json({
      success: true,
      student,
      message: "Student details updated successfully"
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 12. DELETE /api/erp/students/:id - Cascading Delete
export const deleteStudent = async (req, res) => {
  try {
    await connectDB();
    const student = await ErpStudent.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    // Delete payment receipts
    await ErpPayment.deleteMany({ student: student._id });

    // Delete student
    await ErpStudent.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: `Student ${student.studentId} and all payment receipts deleted successfully`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 13. POST /api/erp/students/:id/notes - Add Note
export const addStudentNote = async (req, res) => {
  try {
    await connectDB();
    const { text, author } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: "Note text is required" });
    }

    const student = await ErpStudent.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    const noteAuthor = author || req.erpUser?.user || "Counselor";
    student.notes.unshift({
      text: text.trim(),
      author: noteAuthor,
      createdAt: new Date()
    });

    await student.save();

    return res.status(201).json({
      success: true,
      notes: student.notes,
      message: "Note added successfully"
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 14. GET /api/erp/stats - High-Level Metrics & Financial Health
export const getErpStats = async (req, res) => {
  try {
    await connectDB();

    const [
      totalStudents,
      activeStudents,
      completedStudents,
      droppedStudents,
      totalBatches,
      ongoingBatches,
      totalReceipts,
      financialAgg
    ] = await Promise.all([
      ErpStudent.countDocuments(),
      ErpStudent.countDocuments({ status: "Active" }),
      ErpStudent.countDocuments({ status: "Completed" }),
      ErpStudent.countDocuments({ status: "Dropped" }),
      ErpBatch.countDocuments(),
      ErpBatch.countDocuments({ status: "Ongoing" }),
      ErpPayment.countDocuments(),
      ErpStudent.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$feeDetails.finalFee" },
            totalCollected: { $sum: "$feeDetails.paidAmount" },
            totalDues: { $sum: "$feeDetails.balance" }
          }
        }
      ])
    ]);

    const fin = financialAgg[0] || { totalRevenue: 0, totalCollected: 0, totalDues: 0 };
    const collectionRatio = fin.totalRevenue > 0
      ? Math.round((fin.totalCollected / fin.totalRevenue) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        completedStudents,
        droppedStudents,
        totalBatches,
        ongoingBatches,
        totalReceipts,
        totalRevenue: fin.totalRevenue,
        totalCollected: fin.totalCollected,
        totalDues: fin.totalDues,
        collectionRatio
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 15. GET /api/erp/academy-courses - Catalog for LMS Unlock
export const getAcademyCourses = async (req, res) => {
  try {
    await connectDB();
    const courses = await Course.find()
      .select("title name slug fees price overview courseLength")
      .lean();

    return res.status(200).json({
      success: true,
      courses: courses.map((c) => ({
        _id: c._id,
        title: c.title || c.name || "Program",
        slug: c.slug || "",
        price: Number(c.fees || c.price || 5000) || 5000,
        courseLength: c.courseLength || "Full Course"
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
