import connectDB from "../config/db.js";
import ErpBatch from "../models/ErpBatch.js";
import ErpStudent from "../models/ErpStudent.js";

// GET /api/erp/batches - List Batches with Enrolled Student Count
export const getBatches = async (req, res) => {
  try {
    await connectDB();
    const batches = await ErpBatch.find().sort({ createdAt: -1 }).lean();

    const batchesWithCounts = await Promise.all(
      batches.map(async (b) => {
        const enrolledCount = await ErpStudent.countDocuments({
          batch: b._id,
          status: { $ne: "Dropped" }
        });
        return {
          ...b,
          enrolledCount
        };
      })
    );

    return res.status(200).json({
      success: true,
      batches: batchesWithCounts
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/erp/batches/:id - Batch Details with Full Student Roster
export const getBatchById = async (req, res) => {
  try {
    await connectDB();
    const batch = await ErpBatch.findById(req.params.id).lean();
    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch cohort not found" });
    }

    const students = await ErpStudent.find({ batch: batch._id })
      .select("name studentId phone email status attendanceStats feeDetails enrollmentDate")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      batch: {
        ...batch,
        students,
        enrolledCount: students.filter((s) => s.status !== "Dropped").length
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/erp/batches - Create New Cohort
export const createBatch = async (req, res) => {
  try {
    await connectDB();
    const {
      batchCode,
      name,
      course,
      mentorName,
      mentorEmail,
      schedule,
      startDate,
      endDate,
      maxCapacity = 20,
      meetingLink,
      classroomUrl,
      notes
    } = req.body;

    let normalizedCode = batchCode ? batchCode.trim().toUpperCase() : "";
    if (!normalizedCode) {
      const initials = (course || name || "BATCH")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 4);
      const year = new Date().getFullYear();
      const count = await ErpBatch.countDocuments();
      normalizedCode = `BATCH-${initials}-${year}-${String(count + 1).padStart(3, "0")}`;
    }

    if (!name || !course) {
      return res.status(400).json({ success: false, error: "Batch Name and Course are required" });
    }

    const existing = await ErpBatch.findOne({ batchCode: normalizedCode });
    if (existing) {
      normalizedCode = `${normalizedCode}-${Date.now().toString().slice(-4)}`;
    }

    const batch = await ErpBatch.create({
      batchCode: normalizedCode,
      name: name.trim(),
      course: course.trim(),
      mentorName: mentorName?.trim() || "Head Mentor",
      mentorEmail: mentorEmail?.trim() || "",
      schedule: schedule?.trim() || "Sat - Sun (11:00 AM - 1:30 PM)",
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      maxCapacity: Number(maxCapacity) || 20,
      meetingLink: meetingLink?.trim() || "",
      classroomUrl: classroomUrl?.trim() || "",
      notes: notes?.trim() || "",
      status: "Upcoming"
    });

    return res.status(201).json({
      success: true,
      batch,
      message: `Batch cohort "${batch.name}" created successfully`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/erp/batches/:id - Update Batch Schedule or Details
export const updateBatch = async (req, res) => {
  try {
    await connectDB();
    const batch = await ErpBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    const {
      name,
      course,
      mentorName,
      mentorEmail,
      schedule,
      startDate,
      endDate,
      maxCapacity,
      status,
      meetingLink,
      classroomUrl,
      notes
    } = req.body;

    if (name) batch.name = name.trim();
    if (course) batch.course = course.trim();
    if (mentorName) batch.mentorName = mentorName.trim();
    if (mentorEmail !== undefined) batch.mentorEmail = mentorEmail.trim();
    if (schedule) batch.schedule = schedule.trim();
    if (startDate) batch.startDate = new Date(startDate);
    if (endDate !== undefined) batch.endDate = endDate ? new Date(endDate) : null;
    if (maxCapacity) batch.maxCapacity = Number(maxCapacity);
    if (status) batch.status = status;
    if (meetingLink !== undefined) batch.meetingLink = meetingLink.trim();
    if (classroomUrl !== undefined) batch.classroomUrl = classroomUrl.trim();
    if (notes !== undefined) batch.notes = notes.trim();

    await batch.save();

    return res.status(200).json({
      success: true,
      batch,
      message: "Batch details updated successfully"
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/erp/batches/:id - Delete Cohort
export const deleteBatch = async (req, res) => {
  try {
    await connectDB();
    const batch = await ErpBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    // Unassign batch from any students
    await ErpStudent.updateMany({ batch: batch._id }, { $set: { batch: null } });

    await ErpBatch.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Batch deleted and linked students unassigned successfully"
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
