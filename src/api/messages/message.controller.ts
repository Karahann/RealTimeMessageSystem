import { Request, Response } from "express";
import { MessageService } from "./message.service";
import { logger } from "../../utils/logger";
import { z } from "zod";

const getMessagesSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 50)),
});

export class MessageController {
  static async getConversationMessages(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      const currentUserId = req.user!.userId;
      const { page, limit } = getMessagesSchema.parse(req.query);

      const result = await MessageService.getConversationMessages(
        conversationId,
        currentUserId,
        page,
        limit
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error("Get messages error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch messages",
      });
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const currentUserId = req.user!.userId;

      await MessageService.markMessageAsRead(messageId, currentUserId);

      res.json({
        success: true,
        message: "Message marked as read",
      });
    } catch (error: any) {
      logger.error("Mark as read error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to mark message as read",
      });
    }
  }
}
