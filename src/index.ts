/**
 * WhatsApp MCP Server
 * Main entry point - bootstraps MCP server, SDK connection, and webhook server
 */

import { loadConfigFromEnv, isEnvConfigured, getRequiredEnvVars } from './config/env-loader.js';
import { createToolRegistry, startServer } from './tools/index.js';
import { createWebhookServer } from './webhook/server.js';
import type { AppConfig, EvolutionSDK } from './types/config.js';

// ============================================================================
// SDK Factory
// ============================================================================

async function createSDK(config: AppConfig): Promise<EvolutionSDK> {
  const sdkModule = await import('evolution2-api-sdk');
  const EvolutionSDKClass = sdkModule.Evolution2SDK;
  
  const sdk = new EvolutionSDKClass({
    host: config.evolution.host,
    apiKey: config.evolution.apiKey,
    instanceName: config.evolution.instanceName,
  });

  return sdk as unknown as EvolutionSDK;
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

let isShuttingDown = false;

async function gracefulShutdown(signal: string, webhookServer: ReturnType<typeof createWebhookServer> | null): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.info(`\n[server] Received ${signal}, shutting down gracefully...`);

  // Stop webhook server
  if (webhookServer) {
    try {
      await webhookServer.stop();
    } catch (err) {
      console.error('[server] Error stopping webhook server:', err);
    }
  }

  console.info('[server] Shutdown complete');
  process.exit(0);
}

function setupSignalHandlers(webhookServer: ReturnType<typeof createWebhookServer> | null): void {
  process.on('SIGINT', () => gracefulShutdown('SIGINT', webhookServer));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM', webhookServer));
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.info('[server] Starting WhatsApp MCP server...');

  // Check if environment is configured
  if (!isEnvConfigured()) {
    console.error('[config] Missing required environment variables:');
    getRequiredEnvVars().forEach((v) => console.error(`  - ${v}`));
    console.error('\nSee .env.example for reference.');
    process.exit(1);
  }

  // Load configuration from environment
  let config: AppConfig;

  try {
    config = loadConfigFromEnv();
    console.info('[config] Configuration loaded from environment');
  } catch (err) {
    console.error(`[config] Configuration error: ${(err as Error).message}`);
    process.exit(1);
  }

  // Create SDK
  let sdk: EvolutionSDK;
  try {
    sdk = await createSDK(config);
    console.info('[sdk] Evolution API SDK initialized');
  } catch (err) {
    console.error('[sdk] Failed to initialize SDK:', err);
    process.exit(1);
  }

  // Connect to WhatsApp instance
  try {
    await sdk.instance.connect();
    console.info('[sdk] Connected to WhatsApp instance');
  } catch (err) {
    console.error('[sdk] Failed to connect to WhatsApp:', err);
    process.exit(1);
  }

  // Create webhook server
  let webhookServer: ReturnType<typeof createWebhookServer> | null = null;
  try {
    webhookServer = createWebhookServer(config, async (payload) => {
      console.info(`[webhook] Received message from ${payload.sender}: ${payload.text?.substring(0, 50)}...`);
      // Here you would relay the message to the agent via MCP
      // This could be done via MCP resources or notifications
    });
    await webhookServer.start();
    console.info(`[webhook] Webhook server running at ${webhookServer.address()}`);
  } catch (err) {
    console.error('[webhook] Failed to start webhook server:', err);
    // Non-fatal - MCP server can still run
  }

  // Set up graceful shutdown
  setupSignalHandlers(webhookServer);

  // Create and start MCP server
  try {
    const registry = createToolRegistry(config, sdk);
    console.info(`[mcp] Registered ${registry.tools.length} tools`);

    await startServer(registry);
    console.info('[mcp] MCP server started on stdio transport');
  } catch (err) {
    console.error('[mcp] Failed to start MCP server:', err);
    process.exit(1);
  }
}

// ============================================================================
// Run
// ============================================================================

main().catch((err) => {
  console.error('[server] Unhandled error:', err);
  process.exit(1);
});
