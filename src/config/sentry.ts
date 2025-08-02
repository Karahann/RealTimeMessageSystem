import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { logger } from "../utils/logger";

/**
 * Sentry error tracking ve performance monitoring konfigürasyonu
 */
export const initSentry = (): void => {
  try {
    const dsn = process.env.SENTRY_DSN;

    if (!dsn) {
      logger.warn("SENTRY_DSN not found, Sentry will not be initialized");
      return;
    }

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",

      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Profiling
      profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      integrations: [
        // Node.js profiling integration
        nodeProfilingIntegration(),
      ],

      // Release tracking
      release: process.env.SENTRY_RELEASE || "realtime-messaging@1.0.0",

      // Error filtering
      beforeSend(event, hint) {
        // Development ortamında console'a da yazdır
        if (process.env.NODE_ENV !== "production") {
          logger.error("Sentry Error:", hint.originalException);
        }

        // Belirli errorları filtrele
        const error = hint.originalException;
        if (error instanceof Error) {
          // Rate limit hatalarını gönderme
          if (error.message.includes("Too many requests")) {
            return null;
          }

          // JWT expired hatalarını gönderme (normal durum)
          if (error.message.includes("jwt expired")) {
            return null;
          }
        }

        return event;
      },

      // User context
      initialScope: {
        tags: {
          component: "realtime-messaging-api",
        },
      },
    });

    logger.info("Sentry initialized successfully", {
      environment: process.env.NODE_ENV || "development",
      release: process.env.SENTRY_RELEASE || "realtime-messaging@1.0.0",
    });
  } catch (error) {
    logger.error("Failed to initialize Sentry:", error);
  }
};

/**
 * Sentry Express request handler middleware
 */
export const sentryRequestHandler = () => (req: any, res: any, next: any) => {
  // Set request context in Sentry
  Sentry.getCurrentScope().setTag("endpoint", req.path);
  Sentry.getCurrentScope().setContext("request", {
    method: req.method,
    url: req.url,
    headers: req.headers,
  });
  next();
};

/**
 * Sentry Express error handler middleware
 */
export const sentryErrorHandler =
  () => (err: any, req: any, res: any, next: any) => {
    // Capture error in Sentry
    Sentry.captureException(err);
    next(err);
  };

/**
 * Placeholder for tracing handler
 */
export const sentryTracingHandler = () => (req: any, res: any, next: any) => {
  next();
};

/**
 * Manual error capture
 */
export const captureError = (error: Error, context?: any): void => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("additional", context);
    }
    Sentry.captureException(error);
  });
};

/**
 * Manual message capture
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = "info"
): void => {
  Sentry.captureMessage(message, level);
};

/**
 * Set user context
 */
export const setUser = (user: {
  id?: string;
  email?: string;
  username?: string;
}): void => {
  Sentry.setUser(user);
};

/**
 * Add breadcrumb
 */
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb): void => {
  Sentry.addBreadcrumb(breadcrumb);
};

export { Sentry };
