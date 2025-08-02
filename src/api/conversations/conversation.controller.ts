import { Request, Response } from "express";
import { ConversationService } from "./conversation.service";
import { logger } from "../../utils/logger";
import { z } from "zod";

const createConversationSchema = z.object({
  participantId: z.string().min(1, "Participant ID is required"),
});

export class ConversationController {
  static async createConversation(req: Request, res: Response) {
    try {
      const { participantId } = createConversationSchema.parse(req.body);
      const currentUserId = req.user!.userId;

      if (participantId === currentUserId) {
        return res.status(400).json({
          success: false,
          message: "Cannot create conversation with yourself",
        });
      }

      const conversation = await ConversationService.createOrGetConversation(
        currentUserId,
        participantId
      );

      res.status(201).json({
        success: true,
        message: "Conversation created successfully",
        data: conversation,
      });
    } catch (error: any) {
      logger.error("Create conversation error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create conversation",
      });
    }
  }

  static async getUserConversations(req: Request, res: Response) {
    try {
      const currentUserId = req.user!.userId;
      const conversations = await ConversationService.getUserConversations(
        currentUserId
      );

      res.json({
        success: true,
        data: conversations,
      });
    } catch (error: any) {
      logger.error("Get conversations error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch conversations",
      });
    }
  }
}
