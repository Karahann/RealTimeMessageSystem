import { Router } from "express";
import {
  searchMessages,
  getSearchSuggestions,
  getSearchStats,
} from "./search.controller";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

/**
 * @swagger
 * /api/search/messages:
 *   get:
 *     summary: Search messages with full-text search and filters
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query text
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *         description: Filter by conversation ID
 *       - in: query
 *         name: senderId
 *         schema:
 *           type: string
 *         description: Filter by sender ID
 *       - in: query
 *         name: messageType
 *         schema:
 *           type: string
 *           enum: [text, auto]
 *         description: Filter by message type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter messages after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter messages before this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           messageId:
 *                             type: string
 *                           conversationId:
 *                             type: string
 *                           senderId:
 *                             type: string
 *                           senderUsername:
 *                             type: string
 *                           content:
 *                             type: string
 *                           messageType:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           score:
 *                             type: number
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/messages", authMiddleware, searchMessages);

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions for autocomplete
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Partial search query (minimum 2 characters)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Maximum number of suggestions
 *     responses:
 *       200:
 *         description: Search suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     query:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/suggestions", authMiddleware, getSearchSuggestions);

/**
 * @swagger
 * /api/search/stats:
 *   get:
 *     summary: Get search statistics and analytics
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/stats", authMiddleware, getSearchStats);

export { router as searchRoutes };
