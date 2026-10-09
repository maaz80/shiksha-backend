import connectDB from "../config/db.js";
import ErpPayment from "../models/ErpPayment.js";
import ErpStudent from "../models/ErpStudent.js";

// Generate Unique Receipt Number: REC-2026-001
export const generateReceiptNo = async () => {
  await connectDB();
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;
  
  const existingPayments = await ErpPayment.find(
    { receiptNo: { $regex: `^${prefix}\\d+$` } },
    { receiptNo: 1 }
  ).lean();

  let maxNum = 0;
  for (const p of existingPayments) {
    if (p.receiptNo) {
      const parts = p.receiptNo.split("-");
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let nextSeq = maxNum + 1;
  let candidateNo = `${prefix}${String(nextSeq).padStart(3, "0")}`;

  while (await ErpPayment.exists({ receiptNo: candidateNo })) {
    nextSeq++;
    candidateNo = `${prefix}${String(nextSeq).padStart(3, "0")}`;
  }

  return candidateNo;
};

// GET /api/erp/payments - Get Payment Receipts with Filters
export const getPayments = async (req, res) => {
  try {
    await connectDB();
    const { studentId, receiptNo, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (studentId) query.student = studentId;
    if (receiptNo) query.receiptNo = { $regex: new RegExp(receiptNo.trim(), "i") };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    let [payments, total] = await Promise.all([
      ErpPayment.find(query)
        .populate("student", "name studentId course phone feeDetails email")
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ErpPayment.countDocuments(query)
    ]);

    // Optional name/phone filter in memory if search query passed
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      payments = payments.filter(
        (p) =>
          p.receiptNo?.toLowerCase().includes(term) ||
          p.student?.name?.toLowerCase().includes(term) ||
          p.student?.studentId?.toLowerCase().includes(term) ||
          p.student?.phone?.includes(term) ||
          p.transactionId?.toLowerCase().includes(term)
      );
    }

    return res.status(200).json({
      success: true,
      payments,
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

// POST /api/erp/payments - Record New Installment & Generate Receipt
export const recordPayment = async (req, res) => {
  try {
    await connectDB();
    const { studentId, amount, paymentMode = "UPI", transactionId = "", notes = "", receivedBy } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, error: "Student ID is required" });
    }

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ success: false, error: "Valid payment amount is required" });
    }

    const student = await ErpStudent.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found" });
    }

    const receiptNo = await generateReceiptNo();
    const collector = receivedBy || req.erpUser?.user || "Admin / Accounts";

    const payment = await ErpPayment.create({
      receiptNo,
      student: student._id,
      amount: payAmount,
      paymentMode,
      transactionId: transactionId.trim(),
      notes: notes.trim(),
      receivedBy: collector,
      paymentDate: new Date()
    });

    // Update student ledger
    student.feeDetails.paidAmount = (Number(student.feeDetails.paidAmount) || 0) + payAmount;
    student.notes.unshift({
      text: `Fee Installment Recorded: ₹${payAmount.toLocaleString("en-IN")} received via ${paymentMode} (Receipt: #${receiptNo}). Notes: ${notes || "None"}`,
      author: collector,
      createdAt: new Date()
    });

    await student.save();

    return res.status(201).json({
      success: true,
      payment,
      student,
      message: `Receipt #${receiptNo} generated successfully for ₹${payAmount.toLocaleString("en-IN")}`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
