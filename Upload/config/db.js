import mongoose from "mongoose";

const connectDB = async () => {
     try {
          await mongoose.connect(process.env.MONGO_URI, {
               bufferCommands: false, // Disable buffering globally so queries fail immediately if DB is not connected
               serverSelectionTimeoutMS: 5000 // Timeout connection attempts after 5 seconds instead of 30 seconds
          });
          console.log("MongoDB Connected");
     } catch (error) {
          console.error("MongoDB connection error:", error);
          // Don't exit process in serverless, but in standalone server we can exit
          if (process.env.NODE_ENV !== "production") {
               process.exit(1);
          }
     }
};

export default connectDB;