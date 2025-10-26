import { Server } from "socket.io";
import { RabbitMQService } from "../services/rabbitmq";
import { MessageService } from "../api/messages/message.service";
import { ConversationService } from "../api/conversations/conversation.service";
import { AutoMessage } from "../models/AutoMessage";
import { logger } from "../utils/logger";
import { createServer } from "http";
import { connectDB } from "../config/db";
import { connectRedis } from "../config/redis";
import dotenv from "dotenv";

dotenv.config();

// chore: no-op comment to create a visible commit
// This does not change runtime behavior.

// Socket.IO instance for message broadcasting
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

/**
 * Message consumer - RabbitMQ'dan gelen mesajları işler
 */
async function startMessageConsumer() {
  try {
    // Database connections
    await connectDB();
    await connectRedis();
    await RabbitMQService.connect();

    logger.info("Message consumer starting...");

    // Consumer function
    await RabbitMQService.consumeMessages(async (messageData) => {
      try {
        const { autoMessageId, senderId, receiverId, content } = messageData;

        logger.info(`Processing automatic message: ${autoMessageId} `);

        // Create or get conversation between sender and receiver
        const conversation = await ConversationService.createOrGetConversation(
          senderId,
          receiverId
        );

        // Create message in database
        const message = await MessageService.createMessage(
          conversation.id,
          senderId,
          content,
          "auto" // Message type
        );

        // Emit message to receiver via Socket.IO
        io.to(receiverId).emit("message_received", {
          message,
          conversationId: conversation.id,
          timestamp: new Date(),
          isAutomatic: true,
        });

        // Update AutoMessage as sent
        await AutoMessage.findByIdAndUpdate(autoMessageId, {
          isSent: true,
          sentAt: new Date(),
        });

        logger.info(
          `Automatic message sent successfully: ${autoMessageId} from ${senderId} to ${receiverId}`
        );
      } catch (error) {
        logger.error("Error processing message:", error);
        throw error; // This will trigger nack in RabbitMQ
      }
    });

    logger.info("Message consumer started successfully");
  } catch (error) {
    logger.error("Failed to start message consumer:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down message consumer...");
  await RabbitMQService.close();
  process.exit(0);
});

// Start the consumer
startMessageConsumer();
