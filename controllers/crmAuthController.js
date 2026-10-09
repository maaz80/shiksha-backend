import crypto from "crypto";

const safeCompare = (receivedValue, expectedValue) => {
  const received = Buffer.from(receivedValue || "");
  const expected = Buffer.from(expectedValue || "");
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
};

export const parseCrmToken = (tokenString) => {
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

export const loginCrm = async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password are required" });
    }

    const inputUser = String(username).trim().toLowerCase();
    const inputPass = String(password).trim();

    // Admin credentials
    const adminUsername = (process.env.CRM_USERNAME || process.env.ADMIN_USERNAME || "ShikshaCRM").toLowerCase();
    const adminPassword = process.env.CRM_PASSWORD || process.env.ADMIN_PASSWORD || "ShikshaCRM@123";

    // Counselor / Staff credentials
    const callerUsername = (process.env.CRM_CALLER_USERNAME || "ShikshaCaller").toLowerCase();
    const callerPassword = process.env.CRM_CALLER_PASSWORD || "ShikshaCaller@123";

    const isAdmin = inputUser === adminUsername && safeCompare(inputPass, adminPassword);
    const isCaller = inputUser === callerUsername && safeCompare(inputPass, callerPassword);

    let authenticatedRole = null;
    let displayName = "";

    if (isAdmin) {
      authenticatedRole = "crm_admin";
      displayName = "CRM Administrator";
    } else if (isCaller) {
      authenticatedRole = "crm_caller";
      displayName = "Team Counselor";
    }

    if (!authenticatedRole) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const tokenPayload = {
      role: authenticatedRole,
      user: String(username).trim(),
      portal: "crm",
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

    return res.status(200).json({
      success: true,
      token,
      user: { username: String(username).trim(), name: displayName, role: authenticatedRole },
      message: `${displayName} login successful`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const verifySession = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers["x-crm-token"] || "";
    let token = authHeader;
    if (token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }

    const payload = parseCrmToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: "Invalid or expired session token" });
    }

    return res.status(200).json({
      success: true,
      user: {
        username: payload.user,
        role: payload.role,
        name: payload.role === "crm_admin" ? "CRM Administrator" : "Team Counselor"
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Middleware: Authenticate any CRM user (admin or caller)
export const verifyCrmAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers["x-crm-token"] || "";
  let token = authHeader;
  if (token.startsWith("Bearer ")) {
    token = token.slice(7).trim();
  }

  const payload = parseCrmToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: "Unauthorized: Invalid or expired CRM token" });
  }

  req.crmUser = payload;
  next();
};

// Middleware: Require CRM Admin role
export const requireCrmAdmin = (req, res, next) => {
  if (!req.crmUser || req.crmUser.role !== "crm_admin") {
    return res.status(403).json({ success: false, error: "Forbidden: Admin privileges required" });
  }
  next();
};
