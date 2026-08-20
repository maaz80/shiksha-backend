import { triggerGitHubDeploy } from "../services/githubDeployService.js";

const EXCLUDED_PATHS = new Set([
     "/admin/login",
     "/auth/signup",
     "/auth/login",
     "/auth/logout",
     "/auth/forgot-password",
     "/auth/reset-password",
     "/send-otp",
     "/submit-booking",
     "/enroll",
     "/complete-lesson",
     "/auth/send-otp",
     "/auth/login-otp",
     "/auth/signup-otp",
     "/leads"
]);

export const autoDeployOnAdminChange = (req, res, next) => {
     if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
          const reqPath = req.path.replace(/\/$/, "") || "/";
          const normalizedPath = reqPath.replace(/^\/api/, "") || "/";

          if (!EXCLUDED_PATHS.has(reqPath) && !EXCLUDED_PATHS.has(normalizedPath)) {
               res.on("finish", () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                         console.log(`[AutoDeploy] Admin content modification detected (${req.method} ${req.originalUrl}). Dispatching GitHub build...`);
                         triggerGitHubDeploy();
                    }
               });
          }
     }
     next();
};
