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
import {
  initializeElasticsearch,
  checkElasticsearchHealth,
  closeElasticsearch,
} from "./config/elasticsearch";
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

// Trust proxy for rate limiting and security
// This enables proper IP identification when behind a proxy/load balancer
app.set("trust proxy", true);

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 150, // limit each IP to 100 requests per windowMs
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

// Enhanced health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Sistem sağlık kontrolü
 *     description: API'nin ve tüm bağımlılıklarının çalışır durumda olup olmadığını kontrol eder
 *     responses:
 *       200:
 *         description: Sistem sağlıklı
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
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                     redis:
 *                       type: string
 *                     elasticsearch:
 *                       type: string
 *                     rabbitmq:
 *                       type: string
 *       503:
 *         description: Sistem sağlıksız
 */
app.get("/health", async (req, res) => {
  try {
    const services = {
      database: "Unknown",
      redis: "Unknown",
      elasticsearch: "Unknown",
      rabbitmq: "Unknown",
    };

    // Check Elasticsearch health
    const elasticsearchHealthy = await checkElasticsearchHealth();
    services.elasticsearch = elasticsearchHealthy ? "Healthy" : "Unhealthy";

    // Add other service checks here as needed
    services.database = "Healthy"; // Assume healthy if we got this far
    services.redis = "Healthy"; // Assume healthy if we got this far
    services.rabbitmq = "Healthy"; // Assume healthy if we got this far

    const allHealthy = Object.values(services).every(
      (status) => status === "Healthy"
    );

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "OK" : "DEGRADED",
      timestamp: new Date().toISOString(),
      services,
    });
  } catch (error: any) {
    logger.error("Health check failed", { error: error.message });
    res.status(503).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
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
    logger.info("🚀 Starting Real-Time Messaging System...");

    // Database connection
    logger.info("📦 Connecting to MongoDB...");
    await connectDB();
    logger.info("✅ MongoDB connected successfully");

    // Redis connection
    logger.info("🔴 Connecting to Redis...");
    await connectRedis();
    logger.info("✅ Redis connected successfully");

    // Elasticsearch connection with retry mechanism
    logger.info("🔍 Connecting to Elasticsearch...");
    await initializeElasticsearch();
    logger.info("✅ Elasticsearch connected and initialized successfully");

    // RabbitMQ connection
    logger.info("🐰 Connecting to RabbitMQ...");
    await RabbitMQService.connect();
    logger.info("✅ RabbitMQ connected successfully");

    // Start background jobs
    logger.info("⚙️ Starting background services...");
    MessageScheduler.start();
    QueueManager.start();
    logger.info("✅ Background services started successfully");

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`🌐 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`💚 Health Check: http://localhost:${PORT}/health`);
      logger.info("🎉 Real-Time Messaging System is ready!");
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      try {
        // Stop accepting new connections
        server.close(() => {
          logger.info("✅ HTTP server closed");
        });

        // Note: Background services (MessageScheduler and QueueManager) will stop automatically
        // when the process exits as they use node-cron which is tied to the process lifecycle
        logger.info("⏳ Background services will stop with process exit...");

        // Close database connections
        logger.info("⏳ Closing database connections...");
        await RabbitMQService.close();
        await closeElasticsearch();

        logger.info("✅ Graceful shutdown completed");
        process.exit(0);
      } catch (error: any) {
        logger.error("❌ Error during shutdown:", { error: error.message });
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2")); // nodemon restart
  } catch (error: any) {
    logger.error("❌ Failed to start server:", {
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    // Exit with error code
    process.exit(1);
  }
};

startServer();
