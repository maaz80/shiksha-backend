import crypto from "crypto";
import { createAdminToken } from "../middleware/adminAuth.js";

const safeCompare = (receivedValue, expectedValue) => {
     const received = Buffer.from(receivedValue || "");
     const expected = Buffer.from(expectedValue || "");

     if (received.length !== expected.length) {
          return false;
     }

     return crypto.timingSafeEqual(received, expected);
};

export const loginAdmin = (req, res) => {
     const { username, password } = req.body;
     const adminUsername = process.env.ADMIN_USERNAME;
     const adminPassword = process.env.ADMIN_PASSWORD;

     if (!adminUsername || !adminPassword) {
          return res.status(503).json({ error: "Admin login is not configured." });
     }

     if (!safeCompare(username, adminUsername) || !safeCompare(password, adminPassword)) {
          return res.status(401).json({ error: "Invalid username or password." });
     }

     const token = createAdminToken();

     res.json({
          token,
          expiresIn: 8 * 60 * 60
     });
};
