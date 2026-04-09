/**
 * PermissionGuard Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { PermissionGuard, PermissionDeniedError } from '../security/permissions.js';
import { PermissionTier } from '../types/config.js';

describe('PermissionGuard', () => {
  describe('tier inheritance', () => {
    it('should allow admin to access all tiers', () => {
      const guard = new PermissionGuard(PermissionTier.ADMIN);
      expect(guard.hasPermission(PermissionTier.READ)).toBe(true);
      expect(guard.hasPermission(PermissionTier.SEND)).toBe(true);
      expect(guard.hasPermission(PermissionTier.ADMIN)).toBe(true);
    });

    it('should allow send to access read but not admin', () => {
      const guard = new PermissionGuard(PermissionTier.SEND);
      expect(guard.hasPermission(PermissionTier.READ)).toBe(true);
      expect(guard.hasPermission(PermissionTier.SEND)).toBe(true);
      expect(guard.hasPermission(PermissionTier.ADMIN)).toBe(false);
    });

    it('should allow read only to access read', () => {
      const guard = new PermissionGuard(PermissionTier.READ);
      expect(guard.hasPermission(PermissionTier.READ)).toBe(true);
      expect(guard.hasPermission(PermissionTier.SEND)).toBe(false);
      expect(guard.hasPermission(PermissionTier.ADMIN)).toBe(false);
    });
  });

  describe('assertPermission', () => {
    it('should not throw for sufficient tier', () => {
      const guard = new PermissionGuard(PermissionTier.SEND);
      expect(() => guard.assertPermission(PermissionTier.READ)).not.toThrow();
    });

    it('should throw PermissionDeniedError for insufficient tier', () => {
      const guard = new PermissionGuard(PermissionTier.READ);
      expect(() => guard.assertPermission(PermissionTier.SEND))
        .toThrow(PermissionDeniedError);
    });
  });

  describe('getAgentTier', () => {
    it('should return the configured tier', () => {
      const guard = new PermissionGuard(PermissionTier.ADMIN);
      expect(guard.getAgentTier()).toBe(PermissionTier.ADMIN);
    });
  });
});
