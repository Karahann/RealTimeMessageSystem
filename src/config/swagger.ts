import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Real-Time Messaging System API",
      version: "1.0.0",
      description: `
        Kullanıcıların birbiriyle gerçek zamanlı mesajlaşabileceği backend sistemi.

        ## Özellikler
        - JWT tabanlı kimlik doğrulama
        - Gerçek zamanlı mesajlaşma (Socket.IO)
        - Otomatik mesaj sistemi (RabbitMQ + Cron)
        - Redis ile online kullanıcı takibi
        - Rate limiting ve güvenlik middleware'leri

        ## Authentication
        Bearer token kullanarak auth gerektiren endpoint'lere erişin:
        \`Authorization: Bearer YOUR_JWT_TOKEN\`
      `,
      contact: {
        name: "API Desteği",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token ile kimlik doğrulama",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              example: "60d5ecb74e6b2a001f5e4c8a",
            },
            username: {
              type: "string",
              example: "johndoe",
            },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            isActive: {
              type: "boolean",
              example: true,
            },
            lastSeen: {
              type: "string",
              format: "date-time",
              example: "2025-01-01T12:00:00Z",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Conversation: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "60d5ecb74e6b2a001f5e4c8b",
            },
            participants: {
              type: "array",
              items: {
                $ref: "#/components/schemas/User",
              },
            },
            lastMessage: {
              $ref: "#/components/schemas/Message",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Message: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "60d5ecb74e6b2a001f5e4c8c",
            },
            content: {
              type: "string",
              example: "Merhaba! Nasılsın?",
            },
            sender: {
              $ref: "#/components/schemas/User",
            },
            conversation: {
              type: "string",
              example: "60d5ecb74e6b2a001f5e4c8b",
            },
            messageType: {
              type: "string",
              enum: ["manual", "automatic"],
              example: "manual",
            },
            isRead: {
              type: "boolean",
              example: false,
            },
            readAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        ApiResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "İşlem başarılı",
            },
            data: {
              type: "object",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Hata mesajı",
            },
            error: {
              type: "string",
              example: "Detaylı hata bilgisi",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/api/**/*.routes.ts", "./src/server.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi };
