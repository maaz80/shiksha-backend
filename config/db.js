import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const DEFAULT_MONGO_URI = "mongodb+srv://shikshadesign:ShikshaDesign%401234567890@shikshadesign.kzcf3nf.mongodb.net/shiksha?retryWrites=true&w=majority&appName=Shiksha";

let isConnecting = false;

const connectDB = async () => {
     if (mongoose.connection.readyState >= 1) {
          return mongoose.connection;
     }

     if (isConnecting) {
          return;
     }

     isConnecting = true;
     const mongoUri = (process.env.MONGO_URI || DEFAULT_MONGO_URI).trim();

     try {
          const conn = await mongoose.connect(mongoUri, {
               serverSelectionTimeoutMS: 10000,
               connectTimeoutMS: 10000,
          });
          console.log("✅ MongoDB Connected Successfully");
          isConnecting = false;
          return conn;
     } catch (error) {
          isConnecting = false;
          console.error("❌ MongoDB connection error:", error.message);
     }
};

export default connectDB;