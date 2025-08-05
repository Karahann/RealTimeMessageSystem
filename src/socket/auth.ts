import { Socket } from "socket.io";
import { verifyAccessToken, isTokenBlacklisted } from "../utils/jwt";
import { logger } from "../utils/logger";

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  email?: string;
}

export const socketAuthMiddleware = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      logger.warn("Socket connection attempted without token", {
        socketId: socket.id,
        origin: socket.handshake.headers.origin,
      });
      return next(new Error("Authentication token required"));
    }

    // Verify token format and signature
    const decoded = verifyAccessToken(token);

    // Check if token is blacklisted (logout/revoked)
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      logger.warn("Socket connection attempted with blacklisted token", {
        socketId: socket.id,
        userId: decoded.userId,
        username: decoded.username,
      });
      return next(new Error("Token has been revoked"));
    }

    socket.userId = decoded.userId;
    socket.username = decoded.username;
    socket.email = decoded.email;

    logger.info("Socket authentication successful", {
      socketId: socket.id,
      userId: decoded.userId,
      username: decoded.username,
    });

    next();
  } catch (error: any) {
    logger.error("Socket authentication error:", {
      error: error.message,
      socketId: socket.id,
      origin: socket.handshake.headers.origin,
      userAgent: socket.handshake.headers["user-agent"],
    });

    // Provide more specific error messages for debugging
    if (error.message.includes("expired")) {
      return next(new Error("Token has expired"));
    } else if (error.message.includes("invalid")) {
      return next(new Error("Invalid access token"));
    }

    next(new Error("Authentication failed"));
  }
};
