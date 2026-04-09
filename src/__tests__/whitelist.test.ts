/**
 * WhitelistValidator Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WhitelistValidator, WhitelistValidationError } from '../security/whitelist.js';
import type { WhitelistConfig } from '../types/config.js';

describe('WhitelistValidator', () => {
  let validator: WhitelistValidator;
  const baseConfig: WhitelistConfig = {
    enabled: true,
    phones: ['+5511987654321', '+1234567890'],
    groups: ['123456789@g.us'],
    blockUnknown: true,
  };

  beforeEach(() => {
    validator = new WhitelistValidator(baseConfig);
  });

  describe('enabled flag', () => {
    it('should allow all when enabled is false', () => {
      const disabledValidator = new WhitelistValidator({
        enabled: false,
        phones: [],
        groups: [],
        blockUnknown: true,
      });
      expect(disabledValidator.isPhoneWhitelisted('+9999999999')).toBe(true);
      expect(disabledValidator.isGroupWhitelisted('999999999@g.us')).toBe(true);
      expect(() => disabledValidator.validateOutbound('+9999999999', false)).not.toThrow();
    });

    it('should check whitelist when enabled is true', () => {
      expect(validator.isPhoneWhitelisted('+9999999999')).toBe(false);
    });
  });

  describe('isPhoneWhitelisted', () => {
    it('should return true for whitelisted phone', () => {
      expect(validator.isPhoneWhitelisted('+5511987654321')).toBe(true);
    });

    it('should return true for whitelisted phone with different formatting', () => {
      expect(validator.isPhoneWhitelisted('5511987654321')).toBe(true);
    });

    it('should return false for non-whitelisted phone', () => {
      expect(validator.isPhoneWhitelisted('+5511900000000')).toBe(false);
    });
  });

  describe('isGroupWhitelisted', () => {
    it('should return true for whitelisted group', () => {
      expect(validator.isGroupWhitelisted('123456789@g.us')).toBe(true);
    });

    it('should return false for non-whitelisted group', () => {
      expect(validator.isGroupWhitelisted('999999999@g.us')).toBe(false);
    });
  });

  describe('validateOutbound', () => {
    it('should not throw for whitelisted phone', () => {
      expect(() => validator.validateOutbound('+5511987654321', false)).not.toThrow();
    });

    it('should throw WhitelistValidationError for non-whitelisted phone', () => {
      expect(() => validator.validateOutbound('+5511900000000', false))
        .toThrow(WhitelistValidationError);
    });

    it('should not throw for whitelisted group', () => {
      expect(() => validator.validateOutbound('123456789@g.us', true)).not.toThrow();
    });

    it('should throw for non-whitelisted group', () => {
      expect(() => validator.validateOutbound('999999999@g.us', true))
        .toThrow(WhitelistValidationError);
    });
  });

  describe('blockUnknown flag', () => {
    it('should reject non-whitelisted sender when blockUnknown is true', () => {
      const strictValidator = new WhitelistValidator({ ...baseConfig, blockUnknown: true });
      expect(strictValidator.isInboundAcceptable('+9999999999', false)).toBe(false);
    });

    it('should accept non-whitelisted sender when blockUnknown is false', () => {
      const permissiveValidator = new WhitelistValidator({ ...baseConfig, blockUnknown: false });
      expect(permissiveValidator.isInboundAcceptable('+9999999999', false)).toBe(true);
    });
  });
});
