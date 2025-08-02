import cron from "node-cron";
import { AutoMessage } from "../models/AutoMessage";
import { RabbitMQService } from "../services/rabbitmq";
import { logger } from "../utils/logger";

export class QueueManager {
  private static isRunning = false;

  static start(): void {
    // Her dakika çalış
    cron.schedule("*/1 * * * *", async () => {
      if (this.isRunning) {
        return; // Zaten çalışıyorsa atlayalım
      }

      this.isRunning = true;

      try {
        await this.processScheduledMessages();
      } catch (error) {
        logger.error("Error in queue manager:", error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info("Queue manager started - will run every minute");
  }

  private static async processScheduledMessages(): Promise<void> {
    try {
      const now = new Date();

      // Gönderilmesi gereken mesajları bul
      const messagesToQueue = await AutoMessage.find({
        sendDate: { $lte: now },
        isQueued: false,
        isSent: false,
      })
        .populate("senderId", "username")
        .populate("receiverId", "username");

      if (messagesToQueue.length === 0) {
        return; // Gönderilecek mesaj yok
      }

      logger.info(`Found ${messagesToQueue.length} messages to queue`);

      // Her mesajı RabbitMQ'ya gönder
      for (const autoMessage of messagesToQueue) {
        try {
          await RabbitMQService.publishMessage({
            autoMessageId: autoMessage._id.toString(),
            senderId: autoMessage.senderId.toString(),
            receiverId: autoMessage.receiverId.toString(),
            content: autoMessage.content,
          });

          // Mesajı kuyruğa alındı olarak işaretle
          autoMessage.isQueued = true;
          autoMessage.queuedAt = new Date();
          await autoMessage.save();

          logger.info(
            `Queued message ${autoMessage._id} from ${
              (autoMessage.senderId as any).username
            } to ${(autoMessage.receiverId as any).username}`
          );
        } catch (error) {
          logger.error(`Failed to queue message ${autoMessage._id}:`, error);
        }
      }
    } catch (error) {
      logger.error("Error processing scheduled messages:", error);
      throw error;
    }
  }

  // Manual trigger for testing
  static async processScheduledMessagesManually(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Queue manager is already running");
    }

    this.isRunning = true;
    try {
      await this.processScheduledMessages();
    } finally {
      this.isRunning = false;
    }
  }
}
