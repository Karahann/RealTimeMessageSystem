import cron from "node-cron";
import { AutoMessage } from "../models/AutoMessage";
import { RabbitMQService } from "../services/rabbitmq";
import { logger } from "../utils/logger";

export class QueueManager {
  private static isRunning = false;
  private static readonly timezone: string =
    process.env.CRON_TIMEZONE || process.env.TZ || "UTC";

  static start(): void {
    // Her dakika çalış (timezone yapılandırılabilir)
    cron.schedule(
      "*/1 * * * *",
      async () => {
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
      },
      { timezone: this.timezone }
    );

    logger.info(
      `Queue manager started - will run every minute (timezone: ${this.timezone})`
    );
  }

  private static async processScheduledMessages(): Promise<{
    found: number;
    queued: number;
    queuedIds: string[];
    failedIds: string[];
  }> {
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

      const result = {
        found: messagesToQueue.length,
        queued: 0,
        queuedIds: [] as string[],
        failedIds: [] as string[],
      };

      if (messagesToQueue.length === 0) {
        return result; // Gönderilecek mesaj yok
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

          result.queued += 1;
          result.queuedIds.push(autoMessage._id.toString());
        } catch (error) {
          logger.error(`Failed to queue message ${autoMessage._id}:`, error);
          result.failedIds.push(autoMessage._id.toString());
        }
      }

      return result;
    } catch (error) {
      logger.error("Error processing scheduled messages:", error);
      throw error;
    }
  }

  // Manual trigger for testing
  static async processScheduledMessagesManually(): Promise<{
    found: number;
    queued: number;
    queuedIds: string[];
    failedIds: string[];
  }> {
    if (this.isRunning) {
      throw new Error("Queue manager is already running");
    }

    this.isRunning = true;
    try {
      const result = await this.processScheduledMessages();
      return result;
    } finally {
      this.isRunning = false;
    }
  }
}
