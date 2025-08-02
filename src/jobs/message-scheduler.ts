import cron from "node-cron";
import { logger } from "../utils/logger";
import { User } from "../models/User";
import { AutoMessage } from "../models/AutoMessage";
import { RabbitMQService } from "../services/rabbitmq";

/**
 * Otomatik mesaj zamanlama servisi
 */
export class MessageScheduler {
  private static isRunning = false;

  /**
   * Mesaj zamanlama işini başlatır
   */
  static start() {
    if (this.isRunning) {
      logger.warn("Message scheduler is already running");
      return;
    }

    // Her gece 02:00'da çalışır
    cron.schedule("0 2 * * *", async () => {
      try {
        await this.scheduleMessages();
      } catch (error) {
        logger.error("Error in message scheduling:", error);
      }
    });

    this.isRunning = true;
    logger.info("Message scheduler started - runs daily at 02:00");
  }

  /**
   * Aktif kullanıcılar için otomatik mesajlar zamanlar
   */
  private static async scheduleMessages() {
    try {
      const activeUsers = await User.find({ isActive: true }).lean();

      if (activeUsers.length === 0) {
        logger.info("No active users found for message scheduling");
        return;
      }

      // Kullanıcıları karıştır
      const shuffledUsers = this.shuffleArray([...activeUsers]);
      const messagesToSchedule = [];

      for (let i = 0; i < shuffledUsers.length - 1; i += 2) {
        const sender = shuffledUsers[i];
        const receiver = shuffledUsers[i + 1] || shuffledUsers[0]; // Son kullanici için ilk kullaniciyi receiver yap

        // Gelecek 24 saat içinde rastgele bir zaman seç
        const sendDate = new Date();
        sendDate.setHours(
          sendDate.getHours() + Math.floor(Math.random() * 24) + 1
        );

        const autoMessage = {
          senderId: sender._id,
          receiverId: receiver._id,
          content: this.generateRandomMessage(),
          sendDate,
          isQueued: false,
          isSent: false,
        };

        messagesToSchedule.push(autoMessage);
      }

      // Toplu olarak kaydet
      await AutoMessage.insertMany(messagesToSchedule);

      // Queue'ya mesaj gönder
      await RabbitMQService.publishToQueue("message-scheduler", {
        type: "MESSAGES_SCHEDULED",
        count: messagesToSchedule.length,
        timestamp: new Date(),
      });

      logger.info(`Scheduled ${messagesToSchedule.length} automatic messages`);
    } catch (error) {
      logger.error("Failed to schedule messages:", error);
      throw error;
    }
  }

  /**
   * Array'i karıştırır (Fisher-Yates algoritması)
   */
  private static shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Rastgele mesaj üretir
   */
  private static generateRandomMessage(): string {
    const messages = [
      "Merhaba! Nasılsın?",
      "Bugün güzel bir gün!",
      "Hava nasıl orada?",
      "Ne yapıyorsun?",
      "Keyifler nasıl?",
      "Seni özledim!",
      "Kahve içelim mi?",
      "Bu akşam müsait misin?",
      "Günaydın! Harika bir gün olsun!",
      "İyi akşamlar! Gününü nasıl geçirdin?",
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }
}
