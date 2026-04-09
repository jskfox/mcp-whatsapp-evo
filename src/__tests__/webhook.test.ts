/**
 * Webhook Server Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWebhookServer } from '../webhook/server.js';
import type { AppConfig } from '../types/config.js';
import { PermissionTier } from '../types/config.js';

describe('Webhook Server', () => {
  let config: AppConfig;

  beforeEach(() => {
    config = {
      evolution: {
        host: 'https://api.example.com',
        apiKey: 'test-key',
        instanceName: 'test-instance',
      },
      permissions: {
        tier: PermissionTier.READ,
      },
      whitelist: {
        enabled: true,
        phones: ['+5511987654321'],
        groups: ['123456789@g.us'],
        blockUnknown: true,
      },
      webhook: {
        port: 3847, // Use random port to avoid conflicts
        path: '/webhook',
        token: 'test-webhook-token',
      },
    };
  });

  it('should create webhook server', () => {
    const server = createWebhookServer(config);
    expect(server.server).toBeDefined();
    expect(typeof server.start).toBe('function');
    expect(typeof server.stop).toBe('function');
  });

  it('should return address after creation', () => {
    const server = createWebhookServer(config);
    // Address is null before starting
    expect(server.address()).toBeNull();
  });
});
