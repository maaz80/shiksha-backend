import dotenv from "dotenv";
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });
import express from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import connectDB from "./config/db.js";
import { requireAdminForWrites } from "./middleware/adminAuth.js";
import { sanitizeRequest } from "./middleware/security.js";
import blogRoutes from "./routes/blogRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import bookingRoute from "./routes/bookingRoute.js";
import locationRoute from "./routes/locationRoutes.js";
import pageSEORoutes from "./routes/pageSEORoutes.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.disable("x-powered-by");

const allowedOrigins = [
     "http://localhost:5173",
     "http://localhost:5174",
     "http://localhost:5175",
     "http://localhost:4173",
     "http://10.145.7.198:5173",
     "https://shikssha.netlify.app",
     "https://shikksha.netlify.app",
     ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim()) : []),
];

// CORS configuration
app.use(cors({
     origin(origin, callback) {
          if (!origin || allowedOrigins.includes(origin) || /\.netlify\.app$/.test(origin)) {
               return callback(null, true);
          }

          return callback(new Error("Not allowed by CORS"));
     },
}));

app.use(helmet({
     crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(hpp({ checkQuery: false }));
app.use(sanitizeRequest);

connectDB();



// API auth guard for admin write access
app.use("/api", requireAdminForWrites);

// API Routes
app.use("/api", userRoutes);
app.use("/api", adminRoutes);
app.use("/api", blogRoutes);
app.use("/api", courseRoutes);
app.use("/api", bookingRoute);
app.use("/api", locationRoute);
app.use("/api", pageSEORoutes);
// Health check
app.get("/", (req, res) => {
     res.send("Server Working");
});

// ✅ SPA Catch-all - Use middleware instead of app.get('*')
app.use((req, res, next) => {
     // Skip API routes
     if (req.path.startsWith('/api/')) {
          return next();
     }

     // Skip asset files that might have been missed
     if (req.path.match(/\.(css|js|webp|png|jpg|jpeg|gif|ico|svg|mp4|woff|woff2|ttf|eot)$/)) {
          return next();
     }

});

// 404 handler for unmatched routes
app.use((req, res) => {
     res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
     console.error(err);

     if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
               return res.status(400).json({ error: "File too large. Maximum upload size is 50 MB." });
          }

          return res.status(400).json({ error: err.message });
     }

     if (err.message?.startsWith("Invalid file type")) {
          return res.status(400).json({ error: err.message });
     }

     if (err.type === "entity.too.large") {
          return res.status(413).json({ error: "Request body too large." });
     }

     res.status(err.status || 500).json({
          error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message
     });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
     console.log("Server running on port " + PORT);
});
