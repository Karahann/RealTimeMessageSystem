import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
} from "./auth.validation";
import { blacklistToken } from "../../utils/jwt";
import { logger } from "../../utils/logger";

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await AuthService.register(validatedData);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result,
      });
    } catch (error: any) {
      logger.error("Registration error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Registration failed",
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await AuthService.login(validatedData);

      res.json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error: any) {
      logger.error("Login error:", error);
      res.status(401).json({
        success: false,
        message: error.message || "Login failed",
      });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const result = await AuthService.refreshToken(refreshToken);

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: result,
      });
    } catch (error: any) {
      logger.error("Token refresh error:", error);
      res.status(401).json({
        success: false,
        message: error.message || "Token refresh failed",
      });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const user = await AuthService.getProfile(userId);

      res.json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      logger.error("Get profile error:", error);
      res.status(404).json({
        success: false,
        message: error.message || "User not found",
      });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const validatedData = updateProfileSchema.parse(req.body);

      const updatedUser = await AuthService.updateProfile(
        userId,
        validatedData
      );

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
      });
    } catch (error: any) {
      logger.error("Update profile error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update profile",
      });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);

        // Token'ı blacklist'e ekle
        await blacklistToken(token);
      }

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      logger.error("Logout error:", error);
      // Logout hata verirse bile başarılı döner (güvenlik)
      res.json({
        success: true,
        message: "Logged out successfully",
      });
    }
  }
}
