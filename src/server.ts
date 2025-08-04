import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Sentry must be imported before any other modules
import {
  initSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
} from "./config/sentry";

import { connectDB } from "./config/db";
import { connectRedis } from "./config/redis";
import { initializeElasticsearch } from "./config/elasticsearch";
import { RabbitMQService } from "./services/rabbitmq";
import { MessageScheduler } from "./jobs/message-scheduler";
import { QueueManager } from "./jobs/queue-manager";
import { logger } from "./utils/logger";
import { socketHandler } from "./socket";
import { swaggerSpec, swaggerUi } from "./config/swagger";

// Routes
import authRoutes from "./api/auth/auth.routes";
import userRoutes from "./api/users/user.routes";
import conversationRoutes from "./api/conversations/conversation.routes";
import messageRoutes from "./api/messages/message.routes";
import { searchRoutes } from "./api/search/search.routes";
import testRoutes from "./api/test/test.routes";

dotenv.config();

// Initialize Sentry error tracking
initSentry();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Sentry request handling middleware (must be first)
app.use(sentryRequestHandler());

// Sentry tracing middleware
app.use(sentryTracingHandler());

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/search", searchRoutes);

// Test routes (only in development)
if (process.env.NODE_ENV !== "production") {
  app.use("/api/test", testRoutes);
}

// Swagger API Documentation
/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Sistem sağlık kontrolü
 *     description: API'nin çalışır durumda olup olmadığını kontrol eder
 *     responses:
 *       200:
 *         description: API çalışır durumda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-01-01T12:00:00.000Z"
 */
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Swagger Documentation Routes
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Real-Time Messaging System API",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  })
);

// Sentry error handler middleware (must be after routes)
app.use(sentryErrorHandler());

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  logger.error("Unhandled error:", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// Socket.IO
socketHandler(io);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    await initializeElasticsearch();
    await RabbitMQService.connect();

    // Start cron jobs
    MessageScheduler.start();
    QueueManager.start();

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info("Cron jobs started for automatic messaging system");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Shutting down server...");
      await RabbitMQService.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
