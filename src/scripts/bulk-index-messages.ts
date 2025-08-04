#!/usr/bin/env ts-node

/**
 * Bulk index existing messages to Elasticsearch
 *
 * Usage:
 * npm run index-messages
 * or
 * ts-node src/scripts/bulk-index-messages.ts
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { Message } from "../models/Message";
import { MessageSearchService } from "../services/message-search.service";
import { initializeElasticsearch } from "../config/elasticsearch";
import { logger } from "../utils/logger";

// Load environment variables
dotenv.config();

/**
 * Bulk index all messages from MongoDB to Elasticsearch
 */
async function bulkIndexMessages(): Promise<void> {
  try {
    console.log("🚀 Starting bulk message indexing...");

    // Connect to MongoDB
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb://localhost:27017/realtimemessagesystem";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Initialize Elasticsearch
    await initializeElasticsearch();
    console.log("✅ Connected to Elasticsearch");

    // Get total message count
    const totalMessages = await Message.countDocuments({ isActive: true });
    console.log(`📊 Found ${totalMessages} messages to index`);

    if (totalMessages === 0) {
      console.log("ℹ️  No messages found to index");
      return;
    }

    // Process messages in batches
    const batchSize = 100;
    let indexedCount = 0;
    let errorCount = 0;

    for (let skip = 0; skip < totalMessages; skip += batchSize) {
      try {
        console.log(
          `📦 Processing batch ${Math.floor(skip / batchSize) + 1}/${Math.ceil(
            totalMessages / batchSize
          )} (messages ${skip + 1}-${Math.min(
            skip + batchSize,
            totalMessages
          )})`
        );

        // Fetch batch of messages with populated sender info
        const messages = await Message.find({ isActive: true })
          .populate("senderId", "username email")
          .skip(skip)
          .limit(batchSize)
          .lean();

        if (messages.length === 0) {
          break;
        }

        // Add senderUsername to messages for indexing
        const messagesWithSenderInfo = messages.map((message: any) => ({
          ...message,
          senderUsername: message.senderId?.username || "Unknown User",
        }));

        // Bulk index batch
        await MessageSearchService.bulkIndexMessages(messagesWithSenderInfo);

        indexedCount += messages.length;
        const progress = ((indexedCount / totalMessages) * 100).toFixed(1);
        console.log(
          `✅ Indexed batch successfully. Progress: ${indexedCount}/${totalMessages} (${progress}%)`
        );

        // Small delay to prevent overwhelming Elasticsearch
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (batchError: any) {
        errorCount++;
        console.error(
          `❌ Error processing batch starting at ${skip}:`,
          batchError.message
        );

        // Continue with next batch even if current batch fails
        continue;
      }
    }

    // Summary
    console.log("\n📋 Bulk indexing completed!");
    console.log(`✅ Successfully indexed: ${indexedCount} messages`);
    console.log(`❌ Failed batches: ${errorCount}`);

    if (errorCount > 0) {
      console.log("⚠️  Some batches failed. Check logs for details.");
    }
  } catch (error: any) {
    console.error("💥 Fatal error during bulk indexing:", error);
    logger.error("Bulk indexing failed", { error: error.message });
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("🔒 Database connection closed");
  }
}

/**
 * Delete all messages from Elasticsearch index (use with caution)
 */
async function clearIndex(): Promise<void> {
  try {
    console.log("🗑️  Clearing Elasticsearch messages index...");

    // Initialize Elasticsearch
    await initializeElasticsearch();

    // Delete all documents in the index
    const { elasticsearchClient } = await import("../config/elasticsearch");

    const response = await elasticsearchClient.deleteByQuery({
      index: "messages",
      body: {
        query: {
          match_all: {},
        },
      },
      refresh: true,
    });

    console.log(`✅ Deleted ${response.deleted} documents from index`);
  } catch (error) {
    console.error("❌ Error clearing index:", error);
    process.exit(1);
  }
}

/**
 * Get index statistics
 */
async function getIndexStats(): Promise<void> {
  try {
    console.log("📊 Getting Elasticsearch index statistics...");

    // Initialize Elasticsearch
    await initializeElasticsearch();

    const { elasticsearchClient } = await import("../config/elasticsearch");

    // Get index stats
    const stats = await elasticsearchClient.indices.stats({
      index: "messages",
    });

    const indexStats = stats.indices?.messages;
    if (indexStats) {
      console.log("📈 Index Statistics:");
      console.log(`  Documents: ${indexStats.total?.docs?.count || 0}`);
      console.log(
        `  Size: ${indexStats.total?.store?.size_in_bytes || 0} bytes`
      );
      console.log(`  Deleted docs: ${indexStats.total?.docs?.deleted || 0}`);
    }

    // Get document count
    const count = await elasticsearchClient.count({
      index: "messages",
    });

    console.log(`📊 Total searchable messages: ${count.count}`);
  } catch (error) {
    console.error("❌ Error getting index stats:", error);
    process.exit(1);
  }
}

// Main function - handle command line arguments
async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case "index":
    case undefined:
      await bulkIndexMessages();
      break;

    case "clear":
      await clearIndex();
      break;

    case "stats":
      await getIndexStats();
      break;

    default:
      console.log("Usage:");
      console.log("  npm run index-messages        # Index all messages");
      console.log("  npm run index-messages clear  # Clear index");
      console.log("  npm run index-messages stats  # Show index stats");
      process.exit(1);
  }

  process.exit(0);
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
}
