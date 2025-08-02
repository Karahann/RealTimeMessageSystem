import { Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { logger } from "../utils/logger";

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  email?: string;
}

export const socketAuthMiddleware = (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const decoded = verifyAccessToken(token);

    socket.userId = decoded.userId;
    socket.username = decoded.username;
    socket.email = decoded.email;

    next();
  } catch (error) {
    logger.error("Socket authentication error:", error);
    next(new Error("Invalid token"));
  }
};
