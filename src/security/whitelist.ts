/**
 * Whitelist Validator
 * Enforces phone number and group ID whitelist for all outbound messages
 */

import type { WhitelistConfig } from '../types/config.js';

// ============================================================================
// Errors
// ============================================================================

export class WhitelistValidationError extends Error {
  public readonly isSecurityEvent: true = true;
  public readonly rejectedRecipient: string;

  constructor(recipient: string, message: string) {
    super(message);
    this.name = 'WhitelistValidationError';
    this.rejectedRecipient = recipient;
  }
}

// ============================================================================
// Validator
// ============================================================================

export class WhitelistValidator {
  private readonly phoneSet: ReadonlySet<string>;
  private readonly groupSet: ReadonlySet<string>;
  private readonly blockUnknown: boolean;

  constructor(config: WhitelistConfig) {
    // Normalize phone numbers: ensure E.164 format
    this.phoneSet = new Set(
      config.phones.map((p) => normalizePhone(p))
    );

    // Store group JIDs as-is (already validated by Zod)
    this.groupSet = new Set(config.groups);

    this.blockUnknown = config.blockUnknown;
  }

  /**
   * Check if a phone number is whitelisted
   */
  isPhoneWhitelisted(phone: string): boolean {
    const normalized = normalizePhone(phone);
    return this.phoneSet.has(normalized);
  }

  /**
   * Check if a group ID is whitelisted
   */
  isGroupWhitelisted(groupJid: string): boolean {
    return this.groupSet.has(groupJid);
  }

  /**
   * Validate a recipient for outbound messaging
   * @throws WhitelistValidationError if recipient is not whitelisted
   */
  validateOutbound(recipient: string, isGroup: boolean = false): void {
    if (isGroup) {
      if (!this.isGroupWhitelisted(recipient)) {
        throw new WhitelistValidationError(
          recipient,
          `Group ${recipient} is not in the whitelist`
        );
      }
    } else {
      if (!this.isPhoneWhitelisted(recipient)) {
        throw new WhitelistValidationError(
          recipient,
          `Phone ${recipient} is not in the whitelist`
        );
      }
    }
  }

  /**
   * Check if an inbound sender is acceptable
   * Considers blockUnknown flag for phones not in whitelist
   */
  isInboundAcceptable(sender: string, isGroup: boolean = false): boolean {
    if (isGroup) {
      // For groups, always require whitelist (no blockUnknown fallback)
      return this.isGroupWhitelisted(sender);
    }

    // For phones, check whitelist
    if (this.isPhoneWhitelisted(sender)) {
      return true;
    }

    // If not whitelisted and blockUnknown is false, allow anyway
    return !this.blockUnknown;
  }

  /**
   * Validate an inbound sender
   * @returns true if acceptable, false if should be dropped
   */
  validateInbound(sender: string, isGroup: boolean = false): boolean {
    const acceptable = this.isInboundAcceptable(sender, isGroup);

    if (!acceptable) {
      // Log security event (caller should handle logging)
      return false;
    }

    return true;
  }

  /**
   * Get the count of whitelisted entries (for debugging/monitoring)
   */
  getStats(): { phones: number; groups: number; blockUnknown: boolean } {
    return {
      phones: this.phoneSet.size,
      groups: this.groupSet.size,
      blockUnknown: this.blockUnknown,
    };
  }
}

// ============================================================================
// Phone Number Normalization
// ============================================================================

/**
 * Normalize a phone number to E.164 format
 * Removes all non-digit characters except leading +
 */
export function normalizePhone(phone: string): string {
  // Strip all non-digit characters
  const digits = phone.replace(/[^\d]/g, '');

  // Ensure it starts with +
  if (!phone.startsWith('+') && !phone.startsWith('00')) {
    return `+${digits}`;
  }

  // If it started with 00 (international format without +), convert to +
  if (phone.startsWith('00')) {
    return `+${digits.slice(2)}`;
  }

  return `+${digits}`;
}

/**
 * Validate E.164 format
 */
export function isValidE164(phone: string): boolean {
  const e164Regex = /^\+?[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Validate group JID format
 */
export function isValidGroupJid(jid: string): boolean {
  const jidRegex = /^\d+@g\.us$/;
  return jidRegex.test(jid);
}
