import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import FooterColumn from "./models/FooterColumn.js";

const run = async () => {
     try {
          console.log("Connecting to DB...");
          await mongoose.connect(process.env.MONGO_URI);
          console.log("Connected. Querying FooterColumn...");
          
          const settings = await FooterColumn.findOne({ isGlobal: true });
          console.log("Query completed. Result:", settings);
          
          const columns = await FooterColumn.find({ isGlobal: { $ne: true } });
          console.log("Columns query completed. Result count:", columns.length);
          
          await mongoose.disconnect();
          console.log("Done.");
     } catch (err) {
          console.error("Error occurred:", err);
          process.exit(1);
     }
};

run();
