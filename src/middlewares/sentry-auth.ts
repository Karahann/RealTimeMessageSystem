import { Request, Response, NextFunction } from "express";
import { setUser } from "../config/sentry";

/**
 * Middleware to set Sentry user context from authenticated request
 */
export const sentryUserContext = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user) {
    setUser({
      id: req.user.userId,
      email: req.user.email,
      username: req.user.username,
    });
  }
  next();
};
