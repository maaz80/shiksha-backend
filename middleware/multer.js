import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const allowedMimeTypes = new Set([
     "image/jpeg",
     "image/png",
     "image/webp",
     "video/mp4",
     "video/quicktime",
     "video/webm"
]);

const allowedExtensions = new Set([
     "jpg",
     "jpeg",
     "png",
     "webp",
     "mp4",
     "mov",
     "webm"
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

          // const uniqueSuffix = Math.random().toString(36).substring(2, 5);

          return {
               folder: "kreeya_media",
               public_id: `${seoFriendlyName}`,
               resource_type: "auto",
               allowed_formats: ["jpg", "png", "jpeg", "webp", "mp4", "mov", "webm"]
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
