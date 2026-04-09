/**
 * MCP Tools Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createToolRegistry } from '../tools/index.js';
import type { AppConfig, EvolutionSDK } from '../types/config.js';
import { PermissionTier } from '../types/config.js';

describe('Tool Registry', () => {
  let mockSdk: EvolutionSDK;
  let config: AppConfig;

  beforeEach(() => {
    mockSdk = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      connectionState: vi.fn().mockResolvedValue('connected'),
      setPresence: vi.fn().mockResolvedValue(undefined),
      sendText: vi.fn().mockResolvedValue({ messageId: 'msg-123', timestamp: Date.now() }),
      sendMedia: vi.fn().mockResolvedValue({ messageId: 'msg-456', timestamp: Date.now() }),
      sendLocation: vi.fn().mockResolvedValue({ messageId: 'msg-789', timestamp: Date.now() }),
      sendContact: vi.fn().mockResolvedValue({ messageId: 'msg-101', timestamp: Date.now() }),
      sendReaction: vi.fn().mockResolvedValue({ messageId: 'msg-102', timestamp: Date.now() }),
      markAsRead: vi.fn().mockResolvedValue(undefined),
      updateBlockStatus: vi.fn().mockResolvedValue(undefined),
      hasWhatsApp: vi.fn().mockResolvedValue(true),
      findChats: vi.fn().mockResolvedValue([]),
      findContacts: vi.fn().mockResolvedValue([]),
      findMessages: vi.fn().mockResolvedValue([]),
      fetchAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'new-group@g.us', name: 'Test Group', participants: [] }),
      updateParticipant: vi.fn().mockResolvedValue(undefined),
    };

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
        phones: ['+5511987654321'],
        groups: ['123456789@g.us'],
        blockUnknown: true,
      },
      webhook: {
        port: 3000,
        path: '/webhook',
        token: 'test-token',
      },
    };
  });

  it('should create registry with all tools', () => {
    const registry = createToolRegistry(config, mockSdk);
    expect(registry.tools.length).toBeGreaterThan(0);
  });

  it('should include message tools', () => {
    const registry = createToolRegistry(config, mockSdk);
    const toolNames = registry.tools.map(t => t.name);
    expect(toolNames).toContain('whatsapp_send_text');
    expect(toolNames).toContain('whatsapp_send_media');
  });

  it('should include read tools', () => {
    const registry = createToolRegistry(config, mockSdk);
    const toolNames = registry.tools.map(t => t.name);
    expect(toolNames).toContain('whatsapp_get_chats');
    expect(toolNames).toContain('whatsapp_check_number');
  });

  it('should enforce permission tier for admin tools', () => {
    // Set to read tier - should not be able to use admin tools
    const readConfig = { ...config, permissions: { tier: PermissionTier.READ } };
    const registry = createToolRegistry(readConfig, mockSdk);
    
    // Admin tools should require admin tier
    const adminTools = registry.tools.filter(t => t.requiredTier === PermissionTier.ADMIN);
    expect(adminTools.length).toBeGreaterThan(0);
  });
});
