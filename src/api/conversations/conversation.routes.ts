import { Router } from "express";
import { ConversationController } from "./conversation.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     tags: [Conversations]
 *     summary: Konuşma oluşturma veya mevcut konuşmayı getirme
 *     description: İki kullanıcı arasında konuşma oluşturur veya mevcut konuşmayı döndürür
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantId
 *             properties:
 *               participantId:
 *                 type: string
 *                 example: "60d5ecb74e6b2a001f5e4c8a"
 *                 description: Konuşmaya dahil edilecek diğer kullanıcının ID'si
 *     responses:
 *       201:
 *         description: Yeni konuşma oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Conversation'
 *       200:
 *         description: Mevcut konuşma döndürüldü
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Geçersiz participant ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Geçersiz veya eksik token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", authMiddleware, ConversationController.createConversation);

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     tags: [Conversations]
 *     summary: Kullanıcının konuşmalarını listeleme
 *     description: Giriş yapmış kullanıcının dahil olduğu tüm konuşmaları listeler
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Konuşma listesi başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Conversation'
 *                       example:
 *                         - _id: "60d5ecb74e6b2a001f5e4c8c"
 *                           participants:
 *                             - id: "60d5ecb74e6b2a001f5e4c8a"
 *                               username: "johndoe"
 *                               email: "john@example.com"
 *                             - id: "60d5ecb74e6b2a001f5e4c8b"
 *                               username: "janedoe"
 *                               email: "jane@example.com"
 *                           lastMessage:
 *                             _id: "60d5ecb74e6b2a001f5e4c8d"
 *                             content: "Merhaba!"
 *                             createdAt: "2025-01-01T12:00:00Z"
 *                           createdAt: "2025-01-01T10:00:00Z"
 *       401:
 *         description: Geçersiz veya eksik token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", authMiddleware, ConversationController.getUserConversations);

export default router;
