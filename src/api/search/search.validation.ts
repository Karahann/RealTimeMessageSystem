import { z } from "zod";

/**
 * Validation schema for message search
 */
export const searchMessagesSchema = z.object({
  query: z.string().optional().describe("Search query text"),
  conversationId: z.string().optional().describe("Filter by conversation ID"),
  senderId: z.string().optional().describe("Filter by sender ID"),
  messageType: z
    .enum(["text", "auto"])
    .optional()
    .describe("Filter by message type"),
  startDate: z
    .string()
    .datetime()
    .optional()
    .describe("Filter messages after this date"),
  endDate: z
    .string()
    .datetime()
    .optional()
    .describe("Filter messages before this date"),
  page: z.string().optional().default("1").describe("Page number"),
  limit: z.string().optional().default("20").describe("Items per page"),
});

/**
 * Validation schema for search suggestions
 */
export const searchSuggestionsSchema = z.object({
  query: z
    .string()
    .min(2, "Query must be at least 2 characters")
    .describe("Partial search query"),
  limit: z.string().optional().default("5").describe("Maximum suggestions"),
});

/**
 * Type definitions inferred from schemas
 */
export type SearchMessagesRequest = z.infer<typeof searchMessagesSchema>;
export type SearchSuggestionsRequest = z.infer<typeof searchSuggestionsSchema>;
