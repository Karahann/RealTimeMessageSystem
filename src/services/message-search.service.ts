import { elasticsearchClient } from "../config/elasticsearch";
const esClient = elasticsearchClient as any;
import { logger } from "../utils/logger";
import type { IMessage } from "../models/Message";

// Interface for search indexing (plain object, not Mongoose Document)
interface IMessageForSearch {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: "text" | "auto";
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  senderUsername?: string;
}

export interface SearchResult {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  messageType: "text" | "auto";
  timestamp: Date;
  score: number;
}

export interface SearchResponse {
  messages: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchFilters {
  conversationId?: string;
  senderId?: string;
  messageType?: "text" | "auto";
  startDate?: Date;
  endDate?: Date;
}

/**
 * Message search service using Elasticsearch
 */
export class MessageSearchService {
  private static readonly INDEX_NAME = "messages";

  /**
   * Index a single message
   */
  static async indexMessage(message: IMessageForSearch): Promise<void> {
    try {
      const document = {
        messageId: message._id.toString(),
        conversationId: message.conversationId.toString(),
        senderId: message.senderId.toString(),
        senderUsername: message.senderUsername || "Unknown",
        content: message.content,
        messageType: message.messageType,
        timestamp: message.createdAt,
        isActive: true,
      };

      await esClient.index({
        index: this.INDEX_NAME,
        id: message._id.toString(),
        body: document,
      });

      logger.info("Message indexed successfully", {
        messageId: message._id.toString(),
        conversationId: message.conversationId.toString(),
      });
    } catch (error: any) {
      logger.error("Error indexing message", {
        error: error.message,
        messageId: message._id.toString(),
      });
      throw error;
    }
  }

  /**
   * Index multiple messages in bulk
   */
  static async bulkIndexMessages(messages: IMessageForSearch[]): Promise<void> {
    if (messages.length === 0) return;

    try {
      const body = messages.flatMap((message) => [
        {
          index: {
            _index: this.INDEX_NAME,
            _id: message._id.toString(),
          },
        },
        {
          messageId: message._id.toString(),
          conversationId: message.conversationId.toString(),
          senderId: message.senderId.toString(),
          senderUsername: message.senderUsername || "Unknown",
          content: message.content,
          messageType: message.messageType,
          timestamp: message.createdAt,
          isActive: true,
        },
      ]);

      const response = await esClient.bulk({ body });

      if (response.errors) {
        logger.warn("Some messages failed to index", {
          errors: response.items.filter((item: any) => item.index?.error),
        });
      }

      logger.info("Bulk index completed", {
        total: messages.length,
        successful: response.items.filter((item: any) => !item.index?.error)
          .length,
      });
    } catch (error: any) {
      logger.error("Error bulk indexing messages", {
        error: error.message,
        count: messages.length,
      });
      throw error;
    }
  }

  /**
   * Search messages with full-text search and filters
   */
  static async searchMessages(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResponse> {
    try {
      const from = (page - 1) * limit;

      // Build Elasticsearch query
      const esQuery: any = {
        bool: {
          must: [],
          filter: [],
        },
      };

      // Full-text search on content
      if (query && query.trim()) {
        esQuery.bool.must.push({
          multi_match: {
            query: query.trim(),
            fields: ["content^2", "content.keyword"],
            fuzziness: "AUTO",
            type: "best_fields",
          },
        });
      } else {
        // If no query, match all
        esQuery.bool.must.push({
          match_all: {},
        });
      }

      // Apply filters
      if (filters.conversationId) {
        esQuery.bool.filter.push({
          term: { conversationId: filters.conversationId },
        });
      }

      if (filters.senderId) {
        esQuery.bool.filter.push({
          term: { senderId: filters.senderId },
        });
      }

      if (filters.messageType) {
        esQuery.bool.filter.push({
          term: { messageType: filters.messageType },
        });
      }

      // Date range filter
      if (filters.startDate || filters.endDate) {
        const dateRange: any = {};
        if (filters.startDate) {
          dateRange.gte = filters.startDate.toISOString();
        }
        if (filters.endDate) {
          dateRange.lte = filters.endDate.toISOString();
        }
        esQuery.bool.filter.push({
          range: { timestamp: dateRange },
        });
      }

      // Only active messages
      esQuery.bool.filter.push({
        term: { isActive: true },
      });

      const response = await esClient.search({
        index: this.INDEX_NAME,
        body: {
          query: esQuery,
          sort: [{ timestamp: { order: "desc" } }],
          from,
          size: limit,
          highlight: {
            fields: {
              content: {
                pre_tags: ["<mark>"],
                post_tags: ["</mark>"],
                fragment_size: 150,
                number_of_fragments: 3,
              },
            },
          },
        },
      });

      const hits = response.hits.hits;
      const total = (() => {
        if (!response.hits.total) return 0;
        if (typeof response.hits.total === "number") return response.hits.total;
        return (response.hits.total as any).value || 0;
      })();

      const messages: SearchResult[] = hits.map((hit: any) => ({
        messageId: hit._source.messageId,
        conversationId: hit._source.conversationId,
        senderId: hit._source.senderId,
        senderUsername: hit._source.senderUsername,
        content: hit.highlight?.content?.[0] || hit._source.content,
        messageType: hit._source.messageType,
        timestamp: new Date(hit._source.timestamp),
        score: hit._score,
      }));

      const totalPages = Math.ceil(total / limit);

      logger.info("Search completed", {
        query,
        total,
        page,
        limit,
        filters,
      });

      return {
        messages,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error: any) {
      logger.error("Error searching messages", {
        error: error.message,
        query,
        filters,
      });
      throw error;
    }
  }

  /**
   * Delete a message from the index
   */
  static async deleteMessage(messageId: string): Promise<void> {
    try {
      await esClient.delete({
        index: this.INDEX_NAME,
        id: messageId,
      });

      logger.info("Message deleted from index", { messageId });
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        logger.warn("Message not found in index", { messageId });
        return;
      }

      logger.error("Error deleting message from index", {
        error: error.message,
        messageId,
      });
      throw error;
    }
  }

  /**
   * Update message in the index (soft delete)
   */
  static async updateMessage(
    messageId: string,
    updates: Partial<any>
  ): Promise<void> {
    try {
      await esClient.update({
        index: this.INDEX_NAME,
        id: messageId,
        body: {
          doc: updates,
        },
      });

      logger.info("Message updated in index", { messageId, updates });
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        logger.warn("Message not found in index for update", { messageId });
        return;
      }

      logger.error("Error updating message in index", {
        error: error.message,
        messageId,
      });
      throw error;
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  static async getSuggestions(
    query: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const response = await esClient.search({
        index: this.INDEX_NAME,
        body: {
          size: 0,
          suggest: {
            content_suggest: {
              prefix: query.trim(),
              completion: {
                field: "content.keyword",
                size: limit,
              },
            },
          },
        },
      });

      const suggestions = response.suggest?.content_suggest?.[0]?.options || [];
      return Array.isArray(suggestions)
        ? suggestions.map((option: any) => option.text)
        : [];
    } catch (error: any) {
      logger.error("Error getting search suggestions", {
        error: error.message,
        query,
      });
      return [];
    }
  }
}
