import { Client } from "@elastic/elasticsearch";
import { logger } from "../utils/logger";

/**
 * Elasticsearch client instance
 */
export const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
  requestTimeout: 60000,
  pingTimeout: 3000,
  sniffOnStart: false,
});

/**
 * Initialize Elasticsearch connection and create indexes
 */
export const initializeElasticsearch = async (): Promise<void> => {
  try {
    // Test connection
    const health = await elasticsearchClient.cluster.health();
    logger.info("Elasticsearch connected successfully", {
      status: health.status,
      cluster_name: health.cluster_name,
    });

    // Create messages index if it doesn't exist
    await createMessagesIndex();

    logger.info("Elasticsearch indexes initialized");
  } catch (error: any) {
    logger.error("Elasticsearch connection error", { error: error.message });
    throw error;
  }
};

/**
 * Create messages index with mapping
 */
const createMessagesIndex = async (): Promise<void> => {
  const indexName = "messages";

  try {
    // Check if index exists
    const exists = await elasticsearchClient.indices.exists({
      index: indexName,
    });

    if (!exists) {
      // Create index with mapping
      await elasticsearchClient.indices.create({
        index: indexName,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                message_analyzer: {
                  type: "custom",
                  tokenizer: "standard",
                  filter: ["lowercase", "stop", "snowball"],
                },
              },
            },
          },
          mappings: {
            properties: {
              messageId: {
                type: "keyword",
              },
              conversationId: {
                type: "keyword",
              },
              senderId: {
                type: "keyword",
              },
              senderUsername: {
                type: "keyword",
              },
              content: {
                type: "text",
                analyzer: "message_analyzer",
                fields: {
                  keyword: {
                    type: "keyword",
                    ignore_above: 256,
                  },
                },
              },
              messageType: {
                type: "keyword",
              },
              timestamp: {
                type: "date",
              },
              isActive: {
                type: "boolean",
              },
            },
          },
        },
      });

      logger.info(`Created Elasticsearch index: ${indexName}`);
    } else {
      logger.info(`Elasticsearch index already exists: ${indexName}`);
    }
  } catch (error: any) {
    logger.error(`Error creating Elasticsearch index: ${indexName}`, {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Health check for Elasticsearch
 */
export const checkElasticsearchHealth = async (): Promise<boolean> => {
  try {
    const health = await elasticsearchClient.cluster.health();
    return health.status === "green" || health.status === "yellow";
  } catch (error: any) {
    logger.error("Elasticsearch health check failed", { error: error.message });
    return false;
  }
};
