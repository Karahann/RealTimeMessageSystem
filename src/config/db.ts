import mongoose from "mongoose";
import { logger } from "../utils/logger";

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI ||
        "mongodb://admin:password123@mongodb:27017/realtimemessagesystem?authSource=admin"
    );
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    process.exit(1);
  }
};
