import { Server } from "socket.io";
import { socketAuthMiddleware, AuthenticatedSocket } from "./auth";
import { redisClient } from "../config/redis";
import { MessageService } from "../api/messages/message.service";
import { ConversationService } from "../api/conversations/conversation.service";
import { Conversation } from "../models/Conversation";
import { logger } from "../utils/logger";
import { captureError, setUser, addBreadcrumb } from "../config/sentry";

export const socketHandler = (io: Server) => {
  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  io.on("connection", async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const username = socket.username!;

    logger.info(`User ${username} (${userId}) connected`);

    // Set user context for Sentry
    setUser({ id: userId, username });

    // Add breadcrumb for socket connection
    addBreadcrumb({
      message: "Socket connection established",
      category: "websocket",
      data: { userId, username },
      level: "info",
    });

    try {
      // Add user to online users set in Redis
      await redisClient.sAdd("online_users", userId);

      // Broadcast user online status
      socket.broadcast.emit("user_online", {
        userId,
        username,
        timestamp: new Date(),
      });

      // Join user to their own room for personal notifications
      socket.join(userId);

      // Get and join all user's conversation rooms
      const conversations = await ConversationService.getUserConversations(
        userId
      );
      conversations.forEach((conv) => {
        socket.join(conv.id.toString());
      });
    } catch (error) {
      logger.error("Socket connection setup error:", error);
      captureError(error as Error, {
        userId,
        username,
        context: "socket_connection_setup",
      });
    }

    // Join room event
    socket.on("join_room", async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data;

        // Verify user is participant in this conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        }).populate("participants", "username email");

        if (!conversation) {
          socket.emit("error", {
            message: "Conversation not found or access denied",
          });
          return;
        }

        socket.join(conversationId);

        socket.emit("joined_room", {
          conversationId,
          message: "Successfully joined conversation",
        });

        logger.info(`User ${userId} joined room ${conversationId}`);
      } catch (error) {
        logger.error("Join room error:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Send message event
    socket.on(
      "send_message",
      async (data: { conversationId: string; content: string }) => {
        try {
          const { conversationId, content } = data;

          if (!content || content.trim().length === 0) {
            socket.emit("error", {
              message: "Message content cannot be empty",
            });
            return;
          }

          // Create message in database
          const message = await MessageService.createMessage(
            conversationId,
            userId,
            content.trim(),
            "text"
          );

          // Emit to all users in the conversation room
          io.to(conversationId).emit("message_received", {
            message,
            timestamp: new Date(),
          });

          logger.info(
            `Message sent in conversation ${conversationId} by user ${userId}`
          );
        } catch (error) {
          logger.error("Send message error:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    // Typing indicator
    socket.on("typing_start", (data: { conversationId: string }) => {
      socket.to(data.conversationId).emit("user_typing", {
        userId,
        username,
        conversationId: data.conversationId,
      });
    });

    socket.on("typing_stop", (data: { conversationId: string }) => {
      socket.to(data.conversationId).emit("user_stopped_typing", {
        userId,
        conversationId: data.conversationId,
      });
    });

    // Disconnect event
    socket.on("disconnect", async () => {
      try {
        // Remove user from online users set
        await redisClient.sRem("online_users", userId);

        // Broadcast user offline status
        socket.broadcast.emit("user_offline", {
          userId,
          username,
          timestamp: new Date(),
        });

        logger.info(`User ${username} (${userId}) disconnected`);
      } catch (error) {
        logger.error("Socket disconnect error:", error);
      }
    });

    // Error handling
    socket.on("error", (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  });
};

// Helper function to emit message to specific users
export const emitToUser = (
  io: Server,
  userId: string,
  event: string,
  data: any
) => {
  io.to(userId).emit(event, data);
};

// Helper function to emit message to conversation
export const emitToConversation = (
  io: Server,
  conversationId: string,
  event: string,
  data: any
) => {
  io.to(conversationId).emit(event, data);
};
