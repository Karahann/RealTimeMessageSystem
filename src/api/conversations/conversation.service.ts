import { Conversation } from "../../models/Conversation";
import { User } from "../../models/User";
import mongoose from "mongoose";

export class ConversationService {
  static async createOrGetConversation(userId1: string, userId2: string) {
    // Check if both users exist
    const users = await User.find({
      _id: { $in: [userId1, userId2] },
      isActive: true,
    });

    if (users.length !== 2) {
      throw new Error("One or both users not found");
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId1, userId2] },
    }).populate("participants", "username email");

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        participants: [userId1, userId2],
      });
      await conversation.save();
      await conversation.populate("participants", "username email");
    }

    return conversation;
  }

  static async getUserConversations(userId: string) {
    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "username email lastSeen")
      .populate("lastMessage", "content createdAt messageType")
      .sort({ lastMessageAt: -1, createdAt: -1 });

    return conversations.map((conv) => ({
      id: conv._id,
      participants: conv.participants,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      createdAt: conv.createdAt,
    }));
  }
}
