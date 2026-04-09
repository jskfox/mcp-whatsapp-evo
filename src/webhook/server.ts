/**
 * Webhook HTTP Server
 * Handles incoming webhook events from Evolution API
 */

import { createServer, type Server as HttpServer } from 'http';
import { WebhookAuthenticator } from './auth.js';
import { MessageRelay, type EvolutionWebhookPayload } from './relay.js';
import { WhitelistValidator } from '../security/whitelist.js';
import type { AppConfig } from '../types/config.js';

// ============================================================================
// Errors
// ============================================================================

export class WebhookServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookServerError';
  }
}

// ============================================================================
// Server
// ============================================================================

export interface WebhookServer {
  server: HttpServer;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  address: () => string | null;
}

export function createWebhookServer(
  config: AppConfig,
  onMessage?: (payload: EvolutionWebhookPayload) => void
): WebhookServer {
  const authenticator = new WebhookAuthenticator(config.webhook.token);
  const whitelistValidator = new WhitelistValidator(config.whitelist);
  const relay = new MessageRelay(whitelistValidator);

  // Set up message handler if provided
  if (onMessage) {
    relay.setHandler(async (message) => {
      onMessage({
        event: message.event,
        sender: message.sender,
        remoteJid: message.remoteJid,
        pushName: message.pushName,
        text: message.text,
        timestamp: message.timestamp,
        messageId: message.messageId,
      });
    });
  }

  const server = createServer(async (req, res) => {
    // CORS headers for health checks
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-webhook-token');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check endpoint
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
      return;
    }

    // Webhook endpoint
    if (req.method === 'POST' && req.url === config.webhook.path) {
      // Authenticate
      const authResult = authenticator.isAuthenticated(req.headers);
      if (!authResult) {
        console.warn('[webhook] Authentication failed from', req.headers.host);
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      // Parse body
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      // Process through relay
      const result = await relay.processPayload(payload);

      // Always return 200 to prevent retries (even for rejected messages)
      res.writeHead(200, { 'Content-Type': 'application/json' });

      if (result.accepted) {
        res.end(JSON.stringify({
          received: true,
          messageId: result.message?.messageId,
        }));
      } else {
        // Silent reject - log but return 200
        console.info(`[webhook] Dropped message from ${(payload as Record<string, unknown>)?.sender}: ${result.reason}`);
        res.end(JSON.stringify({ received: true, dropped: true }));
      }
      return;
    }

    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  return {
    server,
    start: (): Promise<void> => {
      return new Promise((resolve, reject) => {
        server.on('error', (err) => {
          reject(new WebhookServerError(`Server error: ${err.message}`));
        });

        server.listen(config.webhook.port, () => {
          console.info(`[webhook] Server listening on port ${config.webhook.port}`);
          resolve();
        });
      });
    },
    stop: (): Promise<void> => {
      return new Promise((resolve) => {
        server.close(() => {
          console.info('[webhook] Server stopped');
          resolve();
        });
      });
    },
    address: (): string | null => {
      const addr = server.address();
      if (typeof addr === 'object' && addr !== null) {
        return `http://localhost:${addr.port}`;
      }
      return null;
    },
  };
}
