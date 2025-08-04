import { Request, Response } from "express";
import {
  MessageSearchService,
  SearchFilters,
} from "../../services/message-search.service";
import {
  searchMessagesSchema,
  searchSuggestionsSchema,
} from "./search.validation";
import { logger } from "../../utils/logger";
import { captureError } from "../../config/sentry";

/**
 * Search messages with full-text search and filters
 */
export const searchMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validate query parameters
    const validatedQuery = searchMessagesSchema.parse(req.query);

    // Extract search parameters
    const {
      query = "",
      conversationId,
      senderId,
      messageType,
      startDate,
      endDate,
      page: pageStr,
      limit: limitStr,
    } = validatedQuery;

    // Manual parsing for numbers
    const page = parseInt(pageStr || "1", 10) || 1;
    const limit = parseInt(limitStr || "20", 10) || 20;

    // Build filters
    const filters: SearchFilters = {};
    if (conversationId) filters.conversationId = conversationId;
    if (senderId) filters.senderId = senderId;
    if (messageType) filters.messageType = messageType;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    // Perform search
    const searchResult = await MessageSearchService.searchMessages(
      query,
      filters,
      page,
      limit
    );

    logger.info("Message search performed", {
      userId: req.user?.userId,
      query,
      filters,
      resultsCount: searchResult.messages.length,
      totalResults: searchResult.total,
    });

    res.json({
      success: true,
      data: searchResult,
      message: `Found ${searchResult.total} messages`,
    });
  } catch (error: any) {
    logger.error("Error in searchMessages controller", {
      error: error.message,
      userId: req.user?.userId,
      query: req.query,
    });

    captureError(error);

    if (error.name === "ZodError") {
      res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: error.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while searching messages",
    });
  }
};

/**
 * Get search suggestions for autocomplete
 */
export const getSearchSuggestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validate query parameters
    const validatedQuery = searchSuggestionsSchema.parse(req.query);
    const { query, limit: limitStr } = validatedQuery;

    // Manual parsing for number
    const limit = parseInt(limitStr || "5", 10) || 5;

    // Get suggestions
    const suggestions = await MessageSearchService.getSuggestions(query, limit);

    logger.info("Search suggestions requested", {
      userId: req.user?.userId,
      query,
      suggestionsCount: suggestions.length,
    });

    res.json({
      success: true,
      data: {
        suggestions,
        query,
      },
      message: `Found ${suggestions.length} suggestions`,
    });
  } catch (error: any) {
    logger.error("Error in getSearchSuggestions controller", {
      error: error.message,
      userId: req.user?.userId,
      query: req.query,
    });

    captureError(error);

    if (error.name === "ZodError") {
      res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: error.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while getting suggestions",
    });
  }
};

/**
 * Get search statistics and analytics
 */
export const getSearchStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // You can implement search analytics here
    // For now, return a simple response

    logger.info("Search stats requested", {
      userId: req.user?.userId,
    });

    res.json({
      success: true,
      data: {
        message: "Search statistics feature coming soon",
        timestamp: new Date().toISOString(),
      },
      message: "Search statistics retrieved",
    });
  } catch (error: any) {
    logger.error("Error in getSearchStats controller", {
      error: error.message,
      userId: req.user?.userId,
    });

    captureError(error);

    res.status(500).json({
      success: false,
      message: "Internal server error while getting search statistics",
    });
  }
};
