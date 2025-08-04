import { Message } from "../../models/Message";
import { Conversation } from "../../models/Conversation";
import { MessageSearchService } from "../../services/message-search.service";
import { logger } from "../../utils/logger";
import mongoose from "mongoose";

export class MessageService {
  static async getConversationMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ) {
    // Check if user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversationId })
      .populate("senderId", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ conversationId });

    return {
      messages: messages.reverse().map((msg) => ({
        id: msg._id,
        conversationId: msg.conversationId,
        sender: msg.senderId,
        content: msg.content,
        messageType: msg.messageType,
        isRead: msg.isRead,
        readAt: msg.readAt,
        createdAt: msg.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total,
      },
    };
  }

  static async createMessage(
    conversationId: string,
    senderId: string,
    content: string,
    messageType: "text" | "auto" = "text"
  ) {
    // Verify conversation exists and user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId,
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    // Create message
    const message = new Message({
      conversationId,
      senderId,
      content,
      messageType,
    });

    await message.save();
    await message.populate("senderId", "username email");

    // Index message in Elasticsearch for search
    try {
      const messageWithSender = {
        ...message.toObject(),
        _id: message._id.toString(),
        conversationId: message.conversationId.toString(),
        senderId: message.senderId.toString(),
        senderUsername: (message.senderId as any)?.username || "Unknown",
      } as any;
      await MessageSearchService.indexMessage(messageWithSender);
    } catch (error: any) {
      logger.error("Failed to index message in Elasticsearch", {
        messageId: message._id.toString(),
        error: error.message,
      });
      // Don't throw error - indexing failure shouldn't break message creation
    }

    // Update conversation's last message
    conversation.lastMessage = message._id as any;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return {
      id: message._id,
      conversationId: message.conversationId,
      sender: message.senderId,
      content: message.content,
      messageType: message.messageType,
      isRead: message.isRead,
      createdAt: message.createdAt,
    };
  }

  static async markMessageAsRead(messageId: string, userId: string) {
    const message = await Message.findById(messageId).populate({
      path: "conversationId",
      select: "participants",
    });

    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user is participant and not the sender
    const conversation = message.conversationId as any;
    if (
      !conversation.participants.includes(userId) ||
      message.senderId.toString() === userId
    ) {
      throw new Error("Cannot mark own message as read or access denied");
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    return true;
  }
}
