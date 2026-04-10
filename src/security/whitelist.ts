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
  private readonly enabled: boolean;
  private readonly phoneSet: ReadonlySet<string>;
  private readonly groupSet: ReadonlySet<string>;
  private readonly blockUnknown: boolean;

  constructor(config: WhitelistConfig) {
    this.enabled = config.enabled;

    if (!this.enabled) {
      this.phoneSet = new Set();
      this.groupSet = new Set();
      this.blockUnknown = false;
      return;
    }

    // Normalize phone numbers: ensure E.164 format
    this.phoneSet = new Set(
      config.phones.map((p) => normalizePhone(p))
    );

    // Store group JIDs as-is (already validated by Zod)
    this.groupSet = new Set(config.groups);

    this.blockUnknown = config.blockUnknown;
  }

  /**
   * Check if whitelist is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if a phone number is whitelisted
   */
  isPhoneWhitelisted(phone: string): boolean {
    if (!this.enabled) return true;
    const normalized = normalizePhone(phone);
    return this.phoneSet.has(normalized);
  }

  /**
   * Check if a group ID is whitelisted
   */
  isGroupWhitelisted(groupJid: string): boolean {
    if (!this.enabled) return true;
    return this.groupSet.has(groupJid);
  }

  /**
   * Validate a recipient for outbound messaging
   * @throws WhitelistValidationError if recipient is not whitelisted
   */
  validateOutbound(recipient: string, isGroup: boolean = false): void {
    if (!this.enabled) return;

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
    if (!this.enabled) return true;

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
  getStats(): { enabled: boolean; phones: number; groups: number; blockUnknown: boolean } {
    return {
      enabled: this.enabled,
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
 * Normalize a phone number to canonical E.164 format
 * Removes all non-digit characters except leading +
 * Handles Mexican mobile format where WhatsApp inserts '1' after country code 52
 * e.g. 5216862155218 -> +526862155218 (same number)
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');

  // Handle Mexican mobile format: 521XXXXXXXXX -> 52XXXXXXXXX
  // WhatsApp sends Mexican mobiles as 521 (country +1), but real number is 52X
  if (digits.startsWith('521') && digits.length === 13) {
    // Remove the '1' after 52 to get canonical form
    // e.g. 5216862155218 -> 526862155218
    return `+${digits.slice(0, 2)}${digits.slice(3)}`;
  }

  // Standard E.164: ensure it starts with +
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
