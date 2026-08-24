import multer from "multer";
import cloudinary from "../config/cloudinary.js";

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB limit for gallery videos and images

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
     if (!file) return cb(null, true);
     const mime = (file.mimetype || "").toLowerCase();
     const originalName = file.originalname || "";
     const extension = originalName.split(".").pop()?.toLowerCase() || "";

     const isAllowedMime = mime.startsWith("image/") || mime.startsWith("video/") || mime === "application/octet-stream";
     const isAllowedExt = [
          "jpg", "jpeg", "png", "webp", "gif", "svg", "heic", "heif", "avif",
          "mp4", "mov", "webm", "m4v", "avi", "3gp", "3gpp", "mkv", "ts"
     ].includes(extension);

     if (isAllowedMime || isAllowedExt) {
          return cb(null, true);
     }

     cb(new Error(`Invalid file type .${extension} (${mime}). Please upload a valid image or video.`));
};

const rawUpload = multer({
     storage,
     fileFilter,
     limits: {
          fileSize: MAX_FILE_SIZE_BYTES,
          files: 50,
          fields: 50,
          fieldNestingDepth: 5
     }
});

const uploadToCloudinary = (file) => {
     return new Promise((resolve, reject) => {
          if (!file || !file.buffer) return resolve();
          const originalName = file.originalname || "file";
          const nameWithoutExtension = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
          const seoFriendlyName = nameWithoutExtension
               .toLowerCase()
               .replace(/[^a-z0-9]+/g, "-")
               .replace(/^-+|-+$/g, "");

          const stream = cloudinary.uploader.upload_stream(
               {
                    folder: "kreeya_media",
                    public_id: seoFriendlyName,
                    resource_type: "auto"
               },
               (error, result) => {
                    if (error) return reject(error);
                    file.path = result.secure_url;
                    resolve(result);
               }
          );
          stream.end(file.buffer);
     });
};

const processCloudinaryUpload = async (req, res, next) => {
     try {
          if (req.file) {
               await uploadToCloudinary(req.file);
          }
          if (req.files) {
               if (Array.isArray(req.files)) {
                    await Promise.all(req.files.map(uploadToCloudinary));
               } else if (typeof req.files === "object") {
                    const uploadPromises = [];
                    for (const fieldName in req.files) {
                         const files = req.files[fieldName];
                         if (Array.isArray(files)) {
                              files.forEach(f => uploadPromises.push(uploadToCloudinary(f)));
                         }
                    }
                    await Promise.all(uploadPromises);
               }
          }
          next();
     } catch (err) {
          next(err);
     }
};

const upload = {
     single: (fieldName) => [rawUpload.single(fieldName), processCloudinaryUpload],
     array: (fieldName, maxCount) => [rawUpload.array(fieldName, maxCount), processCloudinaryUpload],
     fields: (fieldsArray) => [rawUpload.fields(fieldsArray), processCloudinaryUpload],
     any: () => [rawUpload.any(), processCloudinaryUpload],
     none: () => rawUpload.none()
};

export default upload;
