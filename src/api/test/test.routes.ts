import { Router } from "express";
import { captureError, captureMessage } from "../../config/sentry";
import { logger } from "../../utils/logger";

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

export default router;
