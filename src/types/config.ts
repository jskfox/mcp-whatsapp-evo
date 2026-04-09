/**
 * Core type definitions for WhatsApp MCP Server
 */

// ============================================================================
// Permission System
// ============================================================================

export enum PermissionTier {
  READ = 'read',
  SEND = 'send',
  ADMIN = 'admin',
}

/**
 * Tier inheritance: ADMIN ⊃ SEND ⊃ READ
 * An agent with higher tier can access all lower-tier tools.
 */
export const TIER_HIERARCHY: Record<PermissionTier, number> = {
  [PermissionTier.READ]: 1,
  [PermissionTier.SEND]: 2,
  [PermissionTier.ADMIN]: 3,
} as const;

export function hasPermission(userTier: PermissionTier, requiredTier: PermissionTier): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}

// ============================================================================
// Whitelist
// ============================================================================

export interface WhitelistEntry {
  type: 'phone' | 'group';
  id: string; // Normalized: phone = E.164, group = JID
  label?: string; // Optional human-readable label
}

export interface WhitelistConfig {
  phones: string[]; // E.164 format: "5511999999999"
  groups: string[]; // JID format: "123456@g.us"
  blockUnknown: boolean; // Drop messages from unknown senders
}

// ============================================================================
// Configuration
// ============================================================================

export interface EvolutionConfig {
  host: string;
  apiKey: string;
  instanceName: string;
}

export interface PermissionsConfig {
  tier: PermissionTier;
}

export interface WebhookConfig {
  port: number;
  path: string;
  token: string; // Shared secret for auth
}

export interface AppConfig {
  evolution: EvolutionConfig;
  permissions: PermissionsConfig;
  whitelist: WhitelistConfig;
  webhook: WebhookConfig;
}

// ============================================================================
// Messaging
// ============================================================================

export interface MessagePayload {
  to: string; // E.164 phone number or group JID
  text: string;
}

export interface MediaPayload {
  to: string;
  mediaUrl: string;
  caption?: string;
  mimeType?: string;
}

export interface LocationPayload {
  to: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface ContactPayload {
  to: string;
  contactId: string;
}

// ============================================================================
// Inbound Messages (from Webhook)
// ============================================================================

export interface InboundMessage {
  event: string;
  sender: string; // Phone number (E.164)
  remoteJid: string;
  text?: string;
  timestamp: number;
  messageId: string;
  isGroup: boolean;
  pushName?: string;
}

// ============================================================================
// MCP Tool Types
// ============================================================================

import type { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  requiredTier: PermissionTier;
  inputSchema: z.ZodSchema;
  handler: (params: unknown, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  config: AppConfig;
  sdk: EvolutionSDK; // Will be typed properly when we import the SDK
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================================================
// SDK Type (placeholder until evolution2-api-sdk types are available)
// ============================================================================

export interface EvolutionSDK {
  // Instance
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  connectionState: () => Promise<ConnectionState>;
  setPresence: (presence: Presence) => Promise<void>;

  // Messages
  sendText: (params: { to: string; text: string }) => Promise<MessageResult>;
  sendMedia: (params: MediaParams) => Promise<MessageResult>;
  sendLocation: (params: LocationParams) => Promise<MessageResult>;
  sendContact: (params: { to: string; contactId: string }) => Promise<MessageResult>;
  sendReaction: (params: { to: string; messageId: string; reaction: string }) => Promise<MessageResult>;

  // Chat
  markAsRead: (params: { chatId: string }) => Promise<void>;
  updateBlockStatus: (params: { contactId: string; block: boolean }) => Promise<void>;
  hasWhatsApp: (params: { phone: string }) => Promise<boolean>;
  findChats: () => Promise<Chat[]>;
  findContacts: (params?: { search?: string }) => Promise<Contact[]>;
  findMessages: (params?: { chatId?: string; limit?: number }) => Promise<Message[]>;

  // Groups
  fetchAll: () => Promise<Group[]>;
  create: (params: { name: string; participants: string[] }) => Promise<Group>;
  updateParticipant: (params: { groupId: string; action: 'add' | 'remove'; participants: string[] }) => Promise<void>;
}

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';
export type Presence = 'available' | 'unavailable' | 'composing' | 'recording' | 'paused';

export interface MessageResult {
  messageId: string;
  timestamp: number;
}

export interface MediaParams {
  to: string;
  mediaUrl: string;
  caption?: string;
  mimeType?: string;
}

export interface LocationParams {
  to: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: Message;
  timestamp: number;
}

export interface Contact {
  id: string;
  name?: string;
  pushName?: string;
  isBusiness?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  text?: string;
  fromMe: boolean;
  timestamp: number;
  type: string;
}

export interface Group {
  id: string;
  name: string;
  participants: string[];
  createdAt?: number;
}
