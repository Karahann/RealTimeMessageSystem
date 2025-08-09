import amqp from "amqplib";
import { logger } from "../utils/logger";

export class RabbitMQService {
  private static connection: any = null;
  private static channel: any = null;
  private static isConnecting = false;
  private static reconnectTimer: NodeJS.Timeout | null = null;
  private static reconnectDelayMs = 1000; // backoff starting at 1s
  private static readonly QUEUE_NAME = "message_sending_queue";
  private static consumerHandler:
    | ((messageData: {
        autoMessageId: string;
        senderId: string;
        receiverId: string;
        content: string;
      }) => Promise<void>)
    | null = null;

  static async connect(): Promise<void> {
    if (this.isConnecting) return;

    this.isConnecting = true;
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://localhost:5672";
      const socketOptions = {
        heartbeat: 10,
        clientProperties: { connection_name: "realtime-app" },
      } as any;

      this.connection = await amqp.connect(rabbitmqUrl, socketOptions);
      this.connection.on("error", (err: unknown) => {
        logger.error("RabbitMQ connection error event:", err);
      });
      this.connection.on("close", () => {
        logger.warn("RabbitMQ connection closed. Scheduling reconnect...");
        this.invalidateChannel();
        this.scheduleReconnect();
      });

      this.channel = await this.connection.createChannel();
      this.channel.on("error", (err: unknown) => {
        logger.error("RabbitMQ channel error event:", err);
      });
      this.channel.on("close", () => {
        logger.warn("RabbitMQ channel closed. Scheduling reconnect...");
        this.invalidateChannel();
        this.scheduleReconnect();
      });

      // Declare the default sending queue with durability
      await this.channel.assertQueue(this.QUEUE_NAME, { durable: true });

      logger.info("RabbitMQ connected successfully");
      // reset backoff
      this.reconnectDelayMs = 1000;

      // If we had an active consumer, resume it after reconnect
      if (this.consumerHandler) {
        await this.startConsumer(this.consumerHandler);
      }
    } catch (error) {
      logger.error("RabbitMQ connection error:", error);
      this.scheduleReconnect();
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  private static invalidateChannel(): void {
    this.channel = null;
  }

  private static scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 10000);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (err) {
        // connect() already schedules next retry
      }
    }, delay);
    logger.info(`RabbitMQ reconnect scheduled in ${delay}ms`);
  }

  private static async ensureChannel(): Promise<void> {
    if (this.channel) return;
    await this.connect();
    if (!this.channel) {
      throw new Error("RabbitMQ channel is not available after reconnect");
    }
  }

  static async publishMessage(messageData: {
    autoMessageId: string;
    senderId: string;
    receiverId: string;
    content: string;
  }): Promise<void> {
    const payload = Buffer.from(JSON.stringify(messageData));
    await this.ensureChannel();
    try {
      const published = this.channel!.sendToQueue(this.QUEUE_NAME, payload, {
        persistent: true,
      });
      if (published) {
        logger.info(
          `Message queued for processing: ${messageData.autoMessageId}`
        );
      } else {
        throw new Error("Failed to publish message to queue");
      }
    } catch (error) {
      logger.warn("Publish failed, attempting one reconnect and retry...");
      await this.connect();
      const published = this.channel!.sendToQueue(this.QUEUE_NAME, payload, {
        persistent: true,
      });
      if (!published) {
        logger.error("Retry publish failed:", error);
        throw error instanceof Error
          ? error
          : new Error("Unknown error during publish");
      }
    }
  }

  private static async startConsumer(
    onMessage: (messageData: {
      autoMessageId: string;
      senderId: string;
      receiverId: string;
      content: string;
    }) => Promise<void>
  ): Promise<void> {
    await this.ensureChannel();
    await this.channel!.assertQueue(this.QUEUE_NAME, { durable: true });
    await this.channel!.prefetch(1);

    await this.channel!.consume(this.QUEUE_NAME, async (msg: any) => {
      if (!msg) return;
      try {
        const messageData = JSON.parse(msg.content.toString());
        logger.info(`Processing message: ${messageData.autoMessageId}`);
        await onMessage(messageData);
        this.channel!.ack(msg);
        logger.info(
          `Message processed successfully: ${messageData.autoMessageId}`
        );
      } catch (error) {
        logger.error("Error processing message:", error);
        this.channel!.nack(msg, false, false);
      }
    });
    logger.info("RabbitMQ consumer started");
  }

  static async consumeMessages(
    onMessage: (messageData: {
      autoMessageId: string;
      senderId: string;
      receiverId: string;
      content: string;
    }) => Promise<void>
  ): Promise<void> {
    try {
      this.consumerHandler = onMessage;
      await this.startConsumer(onMessage);
    } catch (error) {
      logger.error("Error setting up consumer:", error);
      throw error;
    }
  }

  static async close(): Promise<void> {
    try {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.channel = null;
      this.connection = null;
      logger.info("RabbitMQ connection closed");
    } catch (error) {
      logger.error("Error closing RabbitMQ connection:", error);
    }
  }

  /**
   * Generic queue'ya mesaj gönderir
   */
  static async publishToQueue(queueName: string, data: unknown): Promise<void> {
    await this.ensureChannel();
    try {
      await this.channel!.assertQueue(queueName, { durable: true });
      const message = Buffer.from(JSON.stringify(data));
      const published = this.channel!.sendToQueue(queueName, message, {
        persistent: true,
      });
      if (published) {
        logger.info(`Message sent to queue ${queueName}`);
      } else {
        throw new Error(`Failed to publish message to queue ${queueName}`);
      }
    } catch (error) {
      logger.warn(
        `Publish to ${queueName} failed, attempting one reconnect and retry...`
      );
      await this.connect();
      const message = Buffer.from(JSON.stringify(data));
      const published = this.channel!.sendToQueue(queueName, message, {
        persistent: true,
      });
      if (!published) {
        logger.error(`Retry publish to ${queueName} failed:`, error);
        throw error instanceof Error
          ? error
          : new Error("Unknown error during publishToQueue");
      }
    }
  }

  // Health check method
  static isConnected(): boolean {
    return !!this.channel;
  }
}
