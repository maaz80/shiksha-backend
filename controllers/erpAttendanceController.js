import connectDB from "../config/db.js";
import ErpAttendance from "../models/ErpAttendance.js";
import ErpStudent from "../models/ErpStudent.js";
import ErpBatch from "../models/ErpBatch.js";

// Recalculate attendance stats for all students in a cohort
export const recalculateBatchAttendanceStats = async (batchId) => {
  try {
    await connectDB();
    const sessions = await ErpAttendance.find({ batch: batchId }).lean();
    const totalSessions = sessions.length;

    if (totalSessions === 0) return;

    // Student ID -> attended count map
    const attendedMap = {};
    for (const session of sessions) {
      for (const rec of session.records || []) {
        const sId = rec.student?.toString();
        if (!sId) continue;
        if (!attendedMap[sId]) attendedMap[sId] = 0;
        if (rec.status === "Present" || rec.status === "Late") {
          attendedMap[sId]++;
        }
      }
    }

    // Update students assigned to this batch
    const students = await ErpStudent.find({ batch: batchId });
    for (const st of students) {
      const attended = attendedMap[st._id.toString()] || 0;
      const percentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

      st.attendanceStats = {
        totalSessions,
        attendedSessions: attended,
        percentage
      };
      await st.save();
    }
  } catch (err) {
    console.error("Error recalculating batch attendance stats:", err.message);
  }
};

// POST /api/erp/attendance - Save Daily Class Session Register
export const saveAttendance = async (req, res) => {
  try {
    await connectDB();
    const { batchId, date, topic = "Live Class Session", records = [], markedBy } = req.body;

    if (!batchId) {
      return res.status(400).json({ success: false, error: "Batch ID is required" });
    }
    if (!date) {
      return res.status(400).json({ success: false, error: "Session date is required" });
    }

    const sessionDate = new Date(date);
    const dateStr = sessionDate.toISOString().split("T")[0];
    const marker = markedBy || req.erpUser?.user || "Mentor";

    // Upsert session attendance for this batch on this date
    let attendanceDoc = await ErpAttendance.findOne({ batch: batchId, dateStr });

    if (attendanceDoc) {
      attendanceDoc.date = sessionDate;
      attendanceDoc.topic = topic.trim();
      attendanceDoc.records = records;
      attendanceDoc.markedBy = marker;
      await attendanceDoc.save();
    } else {
      attendanceDoc = await ErpAttendance.create({
        batch: batchId,
        date: sessionDate,
        dateStr,
        topic: topic.trim(),
        records,
        markedBy: marker
      });
    }

    // Trigger background recalculation
    recalculateBatchAttendanceStats(batchId);

    return res.status(200).json({
      success: true,
      attendance: attendanceDoc,
      message: `Attendance register saved successfully for ${dateStr}`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/erp/attendance/by-date - Get Session by Batch & Date
export const getAttendanceByDate = async (req, res) => {
  try {
    await connectDB();
    const { batchId, dateStr } = req.query;

    if (!batchId || !dateStr) {
      return res.status(400).json({ success: false, error: "Batch ID and dateStr (YYYY-MM-DD) are required" });
    }

    const session = await ErpAttendance.findOne({ batch: batchId, dateStr })
      .populate("records.student", "name studentId rollNumber phone")
      .lean();

    return res.status(200).json({
      success: true,
      session: session || null
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/erp/attendance/history - Past Sessions Log with Attendance %
export const getAttendanceHistory = async (req, res) => {
  try {
    await connectDB();
    const { batchId } = req.query;

    if (!batchId) {
      return res.status(400).json({ success: false, error: "Batch ID is required" });
    }

    const sessions = await ErpAttendance.find({ batch: batchId })
      .sort({ date: -1 })
      .lean();

    const history = sessions.map((s) => {
      const total = s.records?.length || 0;
      const present = (s.records || []).filter((r) => r.status === "Present" || r.status === "Late").length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        _id: s._id,
        date: s.date,
        dateStr: s.dateStr,
        topic: s.topic,
        markedBy: s.markedBy,
        totalStudents: total,
        presentCount: present,
        percentage
      };
    });

    return res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
