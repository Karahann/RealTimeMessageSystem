import { Router } from "express";
import { captureError, captureMessage } from "../../config/sentry";
import { logger } from "../../utils/logger";
import { debugToken, isTokenBlacklisted } from "../../utils/jwt";

const router = Router();

/**
 * @swagger
 * /api/test/sentry-error:
 *   post:
 *     summary: Test Sentry error tracking
 *     description: Generates a test error to verify Sentry integration
 *     tags: [Testing]
 *     responses:
 *       500:
 *         description: Test error generated successfully
 */
router.post("/sentry-error", (req, res) => {
  try {
    // Generate a test error
    const error = new Error("🚨 Sentry Test Error - This is intentional!");
    error.name = "SentryTestError";

    // Add some context
    captureError(error, {
      testType: "manual_sentry_test",
      endpoint: "/api/test/sentry-error",
      timestamp: new Date().toISOString(),
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    logger.error("Test error sent to Sentry", { error: error.message });

    res.status(500).json({
      success: false,
      message: "Test error generated and sent to Sentry!",
      error: error.message,
      tip: "Check your Sentry dashboard for this error",
    });
  } catch (err) {
    logger.error("Error in test route:", err);
    res.status(500).json({
      success: false,
      message: "Failed to generate test error",
    });
  }
});

/**
 * @swagger
 * /api/test/sentry-message:
 *   post:
 *     summary: Test Sentry message capture
 *     description: Sends a test message to Sentry
 *     tags: [Testing]
 *     responses:
 *       200:
 *         description: Test message sent successfully
 */
router.post("/sentry-message", (req, res) => {
  try {
    captureMessage("🎯 Sentry Test Message - System is working!", "info");

    logger.info("Test message sent to Sentry");

    res.json({
      success: true,
      message: "Test message sent to Sentry!",
      tip: "Check your Sentry dashboard for this message",
    });
  } catch (err) {
    logger.error("Error in test message route:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send test message",
    });
  }
});

/**
 * @swagger
 * /api/test/throw-error:
 *   post:
 *     summary: Test unhandled error
 *     description: Throws an unhandled error to test global error handler + Sentry
 *     tags: [Testing]
 *     responses:
 *       500:
 *         description: Unhandled error thrown
 */
router.post("/throw-error", (req, res) => {
  // This will be caught by global error handler and sent to Sentry
  throw new Error("🔥 Unhandled Test Error - Testing global error handler!");
});

/**
 * @swagger
 * /api/test/debug-token:
 *   post:
 *     summary: Debug JWT token
 *     description: Analyze a JWT token for debugging authentication issues
 *     tags: [Testing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: JWT token to debug
 *             required:
 *               - token
 *     responses:
 *       200:
 *         description: Token analysis results
 *       400:
 *         description: Token missing or invalid
 */
router.post("/debug-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    // Debug token information
    const tokenInfo = debugToken(token);

    // Check if token is blacklisted
    let blacklistStatus = null;
    try {
      blacklistStatus = await isTokenBlacklisted(token);
    } catch (error) {
      blacklistStatus = "Error checking blacklist status";
    }

    res.json({
      success: true,
      message: "Token debug information",
      data: {
        tokenInfo,
        isBlacklisted: blacklistStatus,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          JWT_SECRET_SET: !!process.env.JWT_SECRET,
          ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
        },
      },
    });
  } catch (error: any) {
    logger.error("Error in debug-token route:", error);
    res.status(500).json({
      success: false,
      message: "Failed to debug token",
      error: error.message,
    });
  }
});

export default router;
