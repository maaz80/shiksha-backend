import crypto from "crypto";

const safeCompare = (receivedValue, expectedValue) => {
  const received = Buffer.from(receivedValue || "");
  const expected = Buffer.from(expectedValue || "");
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
};

export const parseErpToken = (tokenString) => {
  try {
    if (!tokenString) return null;
    const jsonStr = Buffer.from(tokenString, "base64").toString("utf-8");
    const data = JSON.parse(jsonStr);
    if (!data || !data.role || !data.exp) return null;
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
};

export const loginErp = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password are required" });
    }

    const inputUser = String(username).trim().toLowerCase();
    const inputPass = String(password).trim();

    const expectedUser = (process.env.ERP_USERNAME || process.env.ADMIN_USERNAME || "ShikshaERP").toLowerCase();
    const expectedPass = process.env.ERP_PASSWORD || process.env.ADMIN_PASSWORD || "ShikshaERP@123";

    if (inputUser !== expectedUser || !safeCompare(inputPass, expectedPass)) {
      return res.status(401).json({ success: false, error: "Invalid ERP credentials" });
    }

    const tokenPayload = {
      role: "erp_admin",
      user: String(username).trim(),
      portal: "erp",
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

    return res.status(200).json({
      success: true,
      token,
      user: { username: String(username).trim(), name: "ERP Administrator", role: "erp_admin" },
      message: "ERP Administrator login successful"
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const verifyErpSession = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers["x-erp-token"] || "";
    let token = authHeader;
    if (token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }

    const payload = parseErpToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: "Invalid or expired ERP session" });
    }

    return res.status(200).json({
      success: true,
      user: { username: payload.user, role: payload.role, name: "ERP Administrator" }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const verifyErpAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers["x-erp-token"] || "";
  let token = authHeader;
  if (token.startsWith("Bearer ")) {
    token = token.slice(7).trim();
  }

  const payload = parseErpToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: "Unauthorized: Invalid or expired ERP token" });
  }

  req.erpUser = payload;
  next();
};
