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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.disable("x-powered-by");

app.use(helmet({
     crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(hpp({ checkQuery: false }));
app.use(sanitizeRequest);

connectDB();

// CORS configuration
app.use(cors({
     origin: [
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:4173",
          "https://shikssha.netlify.app",
     ]
}));

// Cache headers for static assets
app.use('/assets', express.static(path.join(__dirname, 'dist/assets'), {
     maxAge: '365d',
     setHeaders: (res, filepath) => {
          if (filepath.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) {
               res.setHeader('Cache-Control', 'public, max-age=31536000');
          }
          else if (filepath.match(/\.(css|js)$/)) {
               res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
          else if (filepath.match(/\.(woff|woff2|ttf|eot)$/)) {
               res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
     }
}));

// Serve other static files
app.use(express.static(path.join(__dirname, 'dist'), {
     maxAge: '365d',
     setHeaders: (res, filepath) => {
          if (filepath.match(/\.html$/)) {
               res.setHeader('Cache-Control', 'public, max-age=3600');
          }
     }
}));

// API auth guard for admin write access
app.use("/api", requireAdminForWrites);

// API Routes
app.use("/api", userRoutes);
app.use("/api", adminRoutes);
app.use("/api", blogRoutes);
app.use("/api", courseRoutes);

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

     // For all other routes, serve index.html (SPA catch-all)
     res.sendFile(path.join(__dirname, 'dist', 'index.html'), {
          headers: {
               'Cache-Control': 'public, max-age=3600'
          }
     });
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
