/**
 * Message Relay
 * Validates inbound messages against whitelist and relays to agent
 */

import { WhitelistValidator } from '../security/whitelist.js';
import { Sanitizer } from '../security/sanitizer.js';
import type { InboundMessage } from '../types/config.js';

// ============================================================================
// Errors
// ============================================================================

export class RelayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RelayError';
  }
}

// ============================================================================
// Relay
// ============================================================================

export interface RelayResult {
  accepted: boolean;
  message?: InboundMessage;
  reason?: string;
}

export interface MessageHandler {
  (message: InboundMessage): Promise<void>;
}

export class MessageRelay {
  private readonly whitelistValidator: WhitelistValidator;
  private readonly sanitizer: Sanitizer;
  private handler: MessageHandler | null = null;

  constructor(whitelistValidator: WhitelistValidator) {
    this.whitelistValidator = whitelistValidator;
    this.sanitizer = new Sanitizer();
  }

  /**
   * Set the handler for accepted messages
   */
  setHandler(handler: MessageHandler): void {
    this.handler = handler;
  }

  /**
   * Process an incoming webhook payload
   */
  async processPayload(payload: unknown): Promise<RelayResult> {
    // Parse and validate payload structure
    const parsed = this.parsePayload(payload);
    if (!parsed) {
      return {
        accepted: false,
        reason: 'Invalid payload structure',
      };
    }

    const { sender, remoteJid, isGroup } = parsed;

    // Sanitize inputs
    const sanitizedSender = this.sanitizer.sanitizePhone(sender);
    const sanitizedJid = this.sanitizer.sanitizeGroupJid(remoteJid);

    // Check whitelist
    if (!this.whitelistValidator.validateInbound(sanitizedSender.value, isGroup)) {
      return {
        accepted: false,
        reason: `Sender ${sender} is not whitelisted`,
      };
    }

    // Build sanitized message
    const message: InboundMessage = {
      event: parsed.event,
      sender: sanitizedSender.value,
      remoteJid: sanitizedJid.value,
      text: parsed.text ? this.sanitizer.sanitize(parsed.text).value : undefined,
      timestamp: parsed.timestamp,
      messageId: parsed.messageId,
      isGroup,
      pushName: parsed.pushName ? this.sanitizer.sanitize(parsed.pushName).value : undefined,
    };

    // Relay to handler
    if (this.handler) {
      try {
        await this.handler(message);
      } catch (err) {
        return {
          accepted: false,
          reason: `Relay failed: ${(err as Error).message}`,
        };
      }
    }

    return {
      accepted: true,
      message,
    };
  }

  /**
   * Parse raw webhook payload
   */
  private parsePayload(
    payload: unknown
  ): {
    event: string;
    sender: string;
    remoteJid: string;
    text?: string;
    timestamp: number;
    messageId: string;
    isGroup: boolean;
    pushName?: string;
  } | null {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const p = payload as Record<string, unknown>;

    // Required fields
    if (typeof p.event !== 'string') return null;
    if (typeof p.sender !== 'string') return null;
    if (typeof p.remoteJid !== 'string') return null;
    if (typeof p.timestamp !== 'number') return null;
    if (typeof p.messageId !== 'string') return null;

    // Determine if group message
    const isGroup = p.remoteJid.includes('@g.us');

    return {
      event: p.event,
      sender: p.sender,
      remoteJid: p.remoteJid,
      text: typeof p.text === 'string' ? p.text : undefined,
      timestamp: p.timestamp,
      messageId: p.messageId,
      isGroup,
      pushName: typeof p.pushName === 'string' ? p.pushName : undefined,
    };
  }
}

// ============================================================================
// Evolution API Payload Types (for reference)
// ============================================================================

/**
 * Expected webhook payload structure from Evolution API
 * This may vary based on Evolution API version and configuration
 */
export interface EvolutionWebhookPayload {
  event: 'messages.upsert' | 'connection.update' | string;
  sender: string;
  remoteJid: string;
  pushName?: string;
  text?: string;
  timestamp: number;
  messageId: string;
  data?: unknown;
}
