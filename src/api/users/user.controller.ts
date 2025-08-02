import { Request, Response } from "express";
import { User } from "../../models/User";
import { redisClient } from "../../config/redis";
import { logger } from "../../utils/logger";

export class UserController {
  static async getAllUsers(req: Request, res: Response) {
    try {
      const currentUserId = req.user!.userId;

      const users = await User.find(
        {
          _id: { $ne: currentUserId },
          isActive: true,
        },
        { password: 0 }
      ).sort({ username: 1 });

      res.json({
        success: true,
        data: users.map((user) => ({
          id: user._id,
          username: user.username,
          email: user.email,
          lastSeen: user.lastSeen,
          createdAt: user.createdAt,
        })),
      });
    } catch (error: any) {
      logger.error("Get users error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
      });
    }
  }

  /**
   * Anlık online kullanıcı sayısını döner
   * Redis Set'inin eleman sayısını sorgular (SCARD)
   */
  static async getOnlineUserCount(req: Request, res: Response) {
    try {
      const onlineCount = await redisClient.sCard("online_users");

      res.json({
        success: true,
        data: {
          onlineUserCount: onlineCount,
          timestamp: new Date(),
        },
      });
    } catch (error: any) {
      logger.error("Get online user count error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get online user count",
      });
    }
  }

  /**
   * Belirli bir kullanıcının online durumunu kontrol eder
   * Redis Set'inde kullanıcı ID'sinin varlığını kontrol eder (SISMEMBER)
   */
  static async checkUserOnlineStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const isOnline = await redisClient.sIsMember("online_users", userId);

      res.json({
        success: true,
        data: {
          userId,
          isOnline,
          timestamp: new Date(),
        },
      });
    } catch (error: any) {
      logger.error("Check user online status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check user online status",
      });
    }
  }

  /**
   * Test endpoint'i - Online kullanıcı listesini döner
   * Redis Set'indeki tüm online kullanıcı ID'lerini listeler (SMEMBERS)
   */
  static async getOnlineUsers(req: Request, res: Response) {
    try {
      const onlineUserIds = await redisClient.sMembers("online_users");
      const onlineCount = onlineUserIds.length;

      // Online kullanıcıların detaylarını al
      const onlineUsersDetails = [];
      if (onlineUserIds.length > 0) {
        const users = await User.find(
          { _id: { $in: onlineUserIds } },
          { password: 0, __v: 0 }
        );

        for (const user of users) {
          onlineUsersDetails.push({
            id: user._id,
            username: user.username,
            email: user.email,
            lastSeen: user.lastSeen,
          });
        }
      }

      res.json({
        success: true,
        data: {
          onlineUserCount: onlineCount,
          onlineUserIds,
          onlineUsers: onlineUsersDetails,
          timestamp: new Date(),
        },
        message: `Found ${onlineCount} online users`,
      });
    } catch (error: any) {
      logger.error("Get online users error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get online users list",
      });
    }
  }
}
