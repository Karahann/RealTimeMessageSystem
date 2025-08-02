import { Router } from "express";
import { UserController } from "./user.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

/**
 * @swagger
 * /api/users/list:
 *   get:
 *     tags: [Users]
 *     summary: Sistemdeki kullanıcıları listeleme
 *     description: Giriş yapmış kullanıcı haricindeki tüm aktif kullanıcıları listeler
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı listesi başarıyla alındı
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
 *                         $ref: '#/components/schemas/User'
 *                       example:
 *                         - id: "60d5ecb74e6b2a001f5e4c8a"
 *                           username: "johndoe"
 *                           email: "john@example.com"
 *                           isActive: true
 *                           lastSeen: "2025-01-01T12:00:00Z"
 *                         - id: "60d5ecb74e6b2a001f5e4c8b"
 *                           username: "janedoe"
 *                           email: "jane@example.com"
 *                           isActive: true
 *                           lastSeen: "2025-01-01T11:30:00Z"
 *       401:
 *         description: Geçersiz veya eksik token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/list", authMiddleware, UserController.getAllUsers);

/**
 * @swagger
 * /api/users/online/count:
 *   get:
 *     tags: [Users]
 *     summary: Anlık online kullanıcı sayısı
 *     description: Redis Set'inin eleman sayısını sorgulayarak anlık online kullanıcı sayısını döner
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Online kullanıcı sayısı başarıyla alındı
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
 *                         onlineUserCount:
 *                           type: integer
 *                           example: 5
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Geçersiz veya eksik token
 */
router.get("/online/count", authMiddleware, UserController.getOnlineUserCount);

/**
 * @swagger
 * /api/users/online/status/{userId}:
 *   get:
 *     tags: [Users]
 *     summary: Belirli kullanıcının online durumu
 *     description: Redis Set'inde belirli bir kullanıcı ID'sinin varlığını kontrol eder
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Kontrol edilecek kullanıcının ID'si
 *     responses:
 *       200:
 *         description: Kullanıcı online durumu başarıyla alındı
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
 *                         userId:
 *                           type: string
 *                           example: "60d5ecb74e6b2a001f5e4c8a"
 *                         isOnline:
 *                           type: boolean
 *                           example: true
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Kullanıcı ID'si gerekli
 *       401:
 *         description: Geçersiz veya eksik token
 */
router.get(
  "/online/status/:userId",
  authMiddleware,
  UserController.checkUserOnlineStatus
);

/**
 * @swagger
 * /api/users/online/list:
 *   get:
 *     tags: [Users]
 *     summary: Online kullanıcı listesi (Test endpoint)
 *     description: İstatistik amaçlı Redis Set'indeki tüm online kullanıcı ID'lerini listeler
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Online kullanıcı listesi başarıyla alındı
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
 *                         onlineUserCount:
 *                           type: integer
 *                           example: 3
 *                         onlineUserIds:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["60d5ecb74e6b2a001f5e4c8a", "60d5ecb74e6b2a001f5e4c8b"]
 *                         onlineUsers:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/User'
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Geçersiz veya eksik token
 */
router.get("/online/list", authMiddleware, UserController.getOnlineUsers);

export default router;
