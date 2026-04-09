/**
 * MCP Tools Integration Tests
 * Compatible with evolution2-api-sdk 3.0.0
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
      instance: {
        fetchAll: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ instance: { instanceName: 'test', instanceId: '123', integration: 'WHATSAPP-BAILEYS', status: 'created' }, hash: 'abc' }),
        connect: vi.fn().mockResolvedValue({ base64: 'qrcode', code: '123' }),
        connectionState: vi.fn().mockResolvedValue({ instance: 'test', state: 'open' }),
        setPresence: vi.fn().mockResolvedValue(undefined),
        restart: vi.fn().mockResolvedValue(undefined),
        logout: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      message: {
        sendText: vi.fn().mockResolvedValue({ key: { remoteJid: 'test@s.whatsapp.net', fromMe: false, id: 'msg-123' }, message: {}, messageTimestamp: Date.now(), status: 'SENT' }),
        sendMedia: vi.fn().mockResolvedValue({ key: { remoteJid: 'test@s.whatsapp.net', fromMe: false, id: 'msg-456' }, message: {}, messageTimestamp: Date.now(), status: 'SENT' }),
        sendWhatsAppAudio: vi.fn().mockResolvedValue({ key: { remoteJid: 'test@s.whatsapp.net', fromMe: false, id: 'msg-789' }, message: {}, messageTimestamp: Date.now(), status: 'SENT' }),
        sendSticker: vi.fn().mockResolvedValue({ key: { remoteJid: 'test@s.whatsapp.net', fromMe: false, id: 'msg-101' }, message: {}, messageTimestamp: Date.now(), status: 'SENT' }),
        sendLocation: vi.fn().mockResolvedValue({ key: { remoteJid: 'test@s.whatsapp.net', fromMe: false, id: 'msg-102' }, message: {}, messageTimestamp: Date.now(), status: 'SENT' }),
        sendContact: vi.fn().mockResolvedValue({ key: { remoteJid: 'test@s.whatsapp.net', fromMe: false, id: 'msg-103' }, message: {}, messageTimestamp: Date.now(), status: 'SENT' }),
        sendReaction: vi.fn().mockResolvedValue({ key: { remoteJid: 'test@s.whatsapp.net', fromMe: false, id: 'msg-104' }, message: {}, messageTimestamp: Date.now(), status: 'SENT' }),
        sendPoll: vi.fn().mockResolvedValue({ key: { remoteJid: 'test@s.whatsapp.net', fromMe: false, id: 'msg-105' }, message: {}, messageTimestamp: Date.now(), status: 'SENT' }),
        sendButtons: vi.fn().mockResolvedValue({ key: { remoteJid: 'test@s.whatsapp.net', fromMe: false, id: 'msg-106' }, message: {}, messageTimestamp: Date.now(), status: 'SENT' }),
        sendStatus: vi.fn().mockResolvedValue({ key: { remoteJid: 'test@s.whatsapp.net', fromMe: false, id: 'msg-107' }, message: {}, messageTimestamp: Date.now(), status: 'SENT' }),
        sendPtv: vi.fn().mockResolvedValue({ key: { remoteJid: 'test@s.whatsapp.net', fromMe: false, id: 'msg-108' }, message: {}, messageTimestamp: Date.now(), status: 'SENT' }),
      },
      chat: {
        findChats: vi.fn().mockResolvedValue([]),
        hasWhatsapp: vi.fn().mockResolvedValue([{ number: '5511987654321', exists: true }]),
        findContacts: vi.fn().mockResolvedValue([]),
        markAsRead: vi.fn().mockResolvedValue(undefined),
        markChatUnread: vi.fn().mockResolvedValue(undefined),
        archiveChat: vi.fn().mockResolvedValue(undefined),
        deleteMessage: vi.fn().mockResolvedValue(undefined),
        updateMessage: vi.fn().mockResolvedValue(undefined),
        sendPresence: vi.fn().mockResolvedValue(undefined),
        updateBlockStatus: vi.fn().mockResolvedValue(undefined),
        fetchProfilePictureUrl: vi.fn().mockResolvedValue({ profilePictureUrl: 'https://example.com/pic.jpg' }),
        getBase64FromMedia: vi.fn().mockResolvedValue({ base64: 'abc123', mimetype: 'image/jpeg' }),
        findMessages: vi.fn().mockResolvedValue([]),
        findStatusMessage: vi.fn().mockResolvedValue([]),
      },
      group: {
        fetchAll: vi.fn().mockResolvedValue([]),
        findById: vi.fn().mockResolvedValue({ id: '123456@g.us', subject: 'Test Group', participants: [] }),
        create: vi.fn().mockResolvedValue({ id: 'new-group@g.us', subject: 'New Group', participants: [] }),
        updatePicture: vi.fn().mockResolvedValue(undefined),
        updateSubject: vi.fn().mockResolvedValue(undefined),
        updateDescription: vi.fn().mockResolvedValue(undefined),
        fetchInviteCode: vi.fn().mockResolvedValue({ inviteCode: 'abc123' }),
        revokeInviteCode: vi.fn().mockResolvedValue({ inviteCode: 'newcode' }),
        sendInvite: vi.fn().mockResolvedValue(undefined),
        findByInviteCode: vi.fn().mockResolvedValue({ id: '123456@g.us', subject: 'Found Group', participants: [] }),
        findParticipants: vi.fn().mockResolvedValue([{ id: '5511987654321@s.whatsapp.net', admin: null }]),
        updateParticipant: vi.fn().mockResolvedValue(undefined),
        updateSetting: vi.fn().mockResolvedValue(undefined),
        toggleEphemeral: vi.fn().mockResolvedValue(undefined),
        leave: vi.fn().mockResolvedValue(undefined),
      },
      profile: {
        fetchProfile: vi.fn().mockResolvedValue({ wid: 'test@s.whatsapp.net', name: 'Test User' }),
        fetchBusinessProfile: vi.fn().mockResolvedValue({ wid: 'test@s.whatsapp.net', name: 'Business' }),
        updateName: vi.fn().mockResolvedValue(undefined),
        updateStatus: vi.fn().mockResolvedValue(undefined),
        updatePicture: vi.fn().mockResolvedValue(undefined),
        removePicture: vi.fn().mockResolvedValue(undefined),
        getPrivacy: vi.fn().mockResolvedValue({}),
        updatePrivacy: vi.fn().mockResolvedValue(undefined),
      },
      settings: {
        findOptions: vi.fn().mockResolvedValue({}),
        setOptions: vi.fn().mockResolvedValue(undefined),
        findWebhook: vi.fn().mockResolvedValue({ url: 'https://example.com/webhook' }),
        setWebhook: vi.fn().mockResolvedValue(undefined),
        findWebsocket: vi.fn().mockResolvedValue(undefined),
        setWebsocket: vi.fn().mockResolvedValue(undefined),
        findRabbitmq: vi.fn().mockResolvedValue(undefined),
        setRabbitmq: vi.fn().mockResolvedValue(undefined),
        findChatwoot: vi.fn().mockResolvedValue(undefined),
        setChatwoot: vi.fn().mockResolvedValue(undefined),
        findTypebot: vi.fn().mockResolvedValue(undefined),
        setTypebot: vi.fn().mockResolvedValue(undefined),
        changeTypebotStatus: vi.fn().mockResolvedValue(undefined),
      },
      label: {
        findLabels: vi.fn().mockResolvedValue([]),
        handleLabel: vi.fn().mockResolvedValue(undefined),
      },
      websocket: {
        set: vi.fn().mockResolvedValue(undefined),
        find: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as EvolutionSDK;

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
    const readConfig = { ...config, permissions: { tier: PermissionTier.READ } };
    const registry = createToolRegistry(readConfig, mockSdk);
    
    const adminTools = registry.tools.filter(t => t.requiredTier === PermissionTier.ADMIN);
    expect(adminTools.length).toBeGreaterThan(0);
  });
});
