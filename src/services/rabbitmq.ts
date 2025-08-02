import amqp from "amqplib";
import { logger } from "../utils/logger";

export class RabbitMQService {
  private static connection: any;
  private static channel: any;
  private static readonly QUEUE_NAME = "message_sending_queue";

  static async connect(): Promise<void> {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://localhost:5672";

      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Declare the queue with durability
      await this.channel.assertQueue(this.QUEUE_NAME, {
        durable: true,
      });

      logger.info("RabbitMQ connected successfully");
    } catch (error) {
      logger.error("RabbitMQ connection error:", error);
      throw error;
    }
  }

  static async publishMessage(messageData: {
    autoMessageId: string;
    senderId: string;
    receiverId: string;
    content: string;
  }): Promise<void> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const message = Buffer.from(JSON.stringify(messageData));

      const published = this.channel.sendToQueue(this.QUEUE_NAME, message, {
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
      logger.error("Error publishing message:", error);
      throw error;
    }
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
      if (!this.channel) {
        await this.connect();
      }

      // Set prefetch to 1 to ensure messages are processed one at a time
      await this.channel.prefetch(1);

      await this.channel.consume(this.QUEUE_NAME, async (msg: any) => {
        if (msg) {
          try {
            const messageData = JSON.parse(msg.content.toString());

            logger.info(`Processing message: ${messageData.autoMessageId}`);

            await onMessage(messageData);

            // Acknowledge the message
            this.channel.ack(msg);

            logger.info(
              `Message processed successfully: ${messageData.autoMessageId}`
            );
          } catch (error) {
            logger.error("Error processing message:", error);

            // Reject the message and don't requeue it
            this.channel.nack(msg, false, false);
          }
        }
      });

      logger.info("RabbitMQ consumer started");
    } catch (error) {
      logger.error("Error setting up consumer:", error);
      throw error;
    }
  }

  static async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info("RabbitMQ connection closed");
    } catch (error) {
      logger.error("Error closing RabbitMQ connection:", error);
    }
  }

  /**
   * Generic queue'ya mesaj gönderir
   */
  static async publishToQueue(queueName: string, data: any): Promise<void> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      // Queue'yu oluştur
      await this.channel.assertQueue(queueName, { durable: true });

      const message = Buffer.from(JSON.stringify(data));
      const published = this.channel.sendToQueue(queueName, message, {
        persistent: true,
      });

      if (published) {
        logger.info(`Message sent to queue ${queueName}`);
      } else {
        throw new Error(`Failed to publish message to queue ${queueName}`);
      }
    } catch (error) {
      logger.error(`Error publishing to queue ${queueName}:`, error);
      throw error;
    }
  }

  // Health check method
  static isConnected(): boolean {
    return !!(this.connection && this.connection.connection);
  }
}
