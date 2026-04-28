import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

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
     params: {
          folder: "kreeya_media",
          resource_type: "auto",
          allowed_formats: ["jpg", "png", "jpeg", "webp", "mp4", "mov", "webm"]
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
          files: 1
     }
});

export default upload;
