import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const allowedMimeTypes = new Set([
     "image/jpeg",
     "image/jpg",
     "image/pjpeg",
     "image/png",
     "image/webp",
     "image/gif",
     "image/svg+xml",
     "image/avif",
     "image/bmp",
     "image/tiff",
     "image/x-icon",
     "video/mp4",
     "video/quicktime",
     "video/webm",
     "video/x-matroska"
]);

const allowedExtensions = new Set([
     "jpg",
     "jpeg",
     "png",
     "webp",
     "gif",
     "svg",
     "avif",
     "bmp",
     "tiff",
     "tif",
     "ico",
     "mp4",
     "mov",
     "webm",
     "mkv"
]);

const storage = new CloudinaryStorage({
     cloudinary,
     params: async (req, file) => {
          const originalName = file.originalname || "image";
          const nameWithoutExtension = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;

          const seoFriendlyName = nameWithoutExtension
               .toLowerCase()
               .replace(/[^a-z0-9]+/g, "-")
               .replace(/^-+|-+$/g, "");

          return {
               folder: "kreeya_media",
               public_id: `${seoFriendlyName}`,
               resource_type: "auto",
               allowed_formats: ["jpg", "png", "jpeg", "webp", "gif", "svg", "avif", "bmp", "ico", "mp4", "mov", "webm", "mkv"]
          };
     }
});

const fileFilter = (req, file, cb) => {
     const extension = file.originalname.split(".").pop()?.toLowerCase();

     if (allowedMimeTypes.has(file.mimetype) && allowedExtensions.has(extension)) {
          return cb(null, true);
     }

     cb(new Error("Invalid file type. Only JPG, PNG, WEBP, MP4, MOV, and WEBM files are allowed."));
};

const upload = multer({
     storage,
     fileFilter,
     limits: {
          fileSize: MAX_FILE_SIZE_BYTES,
          files: 8
     }
});

export default upload;
