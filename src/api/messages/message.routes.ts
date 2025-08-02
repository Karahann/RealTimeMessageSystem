import { Router } from "express";
import { MessageController } from "./message.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

/**
 * @swagger
 * /api/messages/conversations/{conversationId}:
 *   get:
 *     tags: [Messages]
 *     summary: Konuşmadaki mesajları listeleme
 *     description: Belirli bir konuşmadaki tüm mesajları sayfalama ile getirir
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         description: Konuşma ID'si
 *         schema:
 *           type: string
 *           example: "60d5ecb74e6b2a001f5e4c8c"
 *       - in: query
 *         name: page
 *         required: false
 *         description: Sayfa numarası (varsayılan 1)
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Sayfa başına mesaj sayısı (varsayılan 50)
 *         schema:
 *           type: integer
 *           example: 50
 *     responses:
 *       200:
 *         description: Mesajlar başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         messages:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Message'
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalMessages:
 *                           type: integer
 *                           example: 142
 *       401:
 *         description: Geçersiz veya eksik token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Bu konuşmaya erişim yetkiniz yok
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Konuşma bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/conversations/:conversationId",
  authMiddleware,
  MessageController.getConversationMessages
);

/**
 * @swagger
 * /api/messages/{messageId}/read:
 *   patch:
 *     tags: [Messages]
 *     summary: Mesajı okundu olarak işaretleme
 *     description: Belirli bir mesajı okundu olarak işaretler ve okuma zamanını kaydeder
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         description: Okundu işaretlenecek mesajın ID'si
 *         schema:
 *           type: string
 *           example: "60d5ecb74e6b2a001f5e4c8d"
 *     responses:
 *       200:
 *         description: Mesaj başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Message'
 *       401:
 *         description: Geçersiz veya eksik token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Bu mesajı işaretleme yetkiniz yok
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Mesaj bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:messageId/read", authMiddleware, MessageController.markAsRead);

export default router;
