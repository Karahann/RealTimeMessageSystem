import { createClient } from "redis";
import { logger } from "../utils/logger";

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info("Redis Connected");
  } catch (error) {
    logger.error("Redis connection error:", error);
    process.exit(1);
  }
};

redisClient.on("error", (err) => {
  logger.error("Redis Client Error:", err);
});
