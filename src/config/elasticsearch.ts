import { Client } from "@elastic/elasticsearch";
import { logger } from "../utils/logger";

/**
 * Elasticsearch client instance
 */
export const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://elasticsearch:9200",
  requestTimeout: 60000,
  pingTimeout: 3000,
  sniffOnStart: false,
  maxRetries: 3,
  resurrectStrategy: "ping",
  tls: {
    rejectUnauthorized: false,
  },
});

/**
 * Initialize Elasticsearch connection with retry mechanism
 */
export const initializeElasticsearch = async (
  maxRetries = 10,
  delay = 5000
): Promise<void> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(
        `[Elasticsearch] Connection attempt ${attempt}/${maxRetries} to ${
          process.env.ELASTICSEARCH_URL || "http://elasticsearch:9200"
        }`
      );

      // Test connection with ping
      const pingResult = await elasticsearchClient.ping();
      if (!pingResult) {
        throw new Error("Elasticsearch ping failed");
      }

      // Check cluster health
      const health = await elasticsearchClient.cluster.health({
        wait_for_status: "yellow", // yellow is acceptable for single-node
        timeout: "30s",
      });

      logger.info("✅ Elasticsearch connected successfully", {
        status: health.status,
        cluster_name: health.cluster_name,
        number_of_nodes: health.number_of_nodes,
        active_shards: health.active_shards,
      });

      // Create indexes after successful connection
      await createMessagesIndex();
      logger.info("✅ Elasticsearch indexes initialized");

      return;
    } catch (error: any) {
      lastError = error;
      logger.error(`❌ Elasticsearch connection attempt ${attempt} failed:`, {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        url: process.env.ELASTICSEARCH_URL || "http://elasticsearch:9200",
      });

      if (attempt === maxRetries) {
        break;
      }

      logger.info(`⏳ Waiting ${delay}ms before next attempt...`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Exponential backoff with jitter
      delay = Math.min(delay * 1.2 + Math.random() * 1000, 30000);
    }
  }

  const errorMessage = `Failed to connect to Elasticsearch after ${maxRetries} attempts. Last error: ${lastError?.message}`;
  logger.error("❌ " + errorMessage);
  throw new Error(errorMessage);
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

      logger.info(`✅ Created Elasticsearch index: ${indexName}`);
    } else {
      logger.info(`ℹ️ Elasticsearch index already exists: ${indexName}`);
    }
  } catch (error: any) {
    logger.error(`❌ Error creating Elasticsearch index: ${indexName}`, {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Wait for Elasticsearch to be ready
 */
export const waitForElasticsearch = async (
  timeoutMs = 120000
): Promise<boolean> => {
  const startTime = Date.now();
  const checkInterval = 2000;

  logger.info(
    `⏳ Waiting for Elasticsearch to be ready (timeout: ${timeoutMs}ms)...`
  );

  while (Date.now() - startTime < timeoutMs) {
    try {
      const health = await elasticsearchClient.cluster.health({
        timeout: "1s",
        wait_for_status: "yellow",
      });

      if (health.status === "green" || health.status === "yellow") {
        logger.info(`✅ Elasticsearch is ready with status: ${health.status}`);
        return true;
      }
    } catch (error) {
      // Ignore error and continue waiting
      logger.debug("Elasticsearch not ready yet, continuing to wait...");
    }

    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  logger.error(`❌ Elasticsearch did not become ready within ${timeoutMs}ms`);
  return false;
};

/**
 * Health check for Elasticsearch
 */
export const checkElasticsearchHealth = async (): Promise<boolean> => {
  try {
    const health = await elasticsearchClient.cluster.health({
      timeout: "5s",
    });

    const isHealthy = health.status === "green" || health.status === "yellow";

    if (isHealthy) {
      logger.debug("✅ Elasticsearch health check passed", {
        status: health.status,
        nodes: health.number_of_nodes,
      });
    } else {
      logger.warn("⚠️ Elasticsearch health check warning", {
        status: health.status,
      });
    }

    return isHealthy;
  } catch (error: any) {
    logger.error("❌ Elasticsearch health check failed", {
      error: error.message,
    });
    return false;
  }
};

/**
 * Graceful shutdown for Elasticsearch
 */
export const closeElasticsearch = async (): Promise<void> => {
  try {
    await elasticsearchClient.close();
    logger.info("✅ Elasticsearch connection closed gracefully");
  } catch (error: any) {
    logger.error("❌ Error closing Elasticsearch connection", {
      error: error.message,
    });
  }
};
