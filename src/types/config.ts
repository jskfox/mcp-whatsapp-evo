/**
 * Core type definitions for WhatsApp MCP Server
 * Compatible with evolution2-api-sdk 3.0.0
 */

// ============================================================================
// Permission System
// ============================================================================

export enum PermissionTier {
  READ = 'read',
  SEND = 'send',
  ADMIN = 'admin',
}

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

export interface WhitelistConfig {
  enabled: boolean;
  phones: string[];
  groups: string[];
  blockUnknown: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

export interface EvolutionConfig {
  host: string;
  apiKey: string;
  instanceName?: string;
}

export interface PermissionsConfig {
  tier: PermissionTier;
}

export interface WebhookConfig {
  port: number;
  path: string;
  token: string;
}

export interface AppConfig {
  evolution: EvolutionConfig;
  permissions: PermissionsConfig;
  whitelist: WhitelistConfig;
  webhook: WebhookConfig;
}

// ============================================================================
// Inbound Messages (from Webhook)
// ============================================================================

export interface InboundMessage {
  event: string;
  sender: string;
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
  sdk: EvolutionSDK;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================================================
// SDK Type - evolution2-api-sdk 3.0.0
// ============================================================================

export interface EvolutionSDK {
  instance: {
    fetchAll: () => Promise<InstanceInfo[]>;
    create: (params: { instanceName: string; integration?: string; qrcode?: boolean }) => Promise<CreateInstanceResult>;
    connect: (instanceName?: string) => Promise<QRCodeResult>;
    connectionState: (instanceName?: string) => Promise<ConnectionStateResult>;
    setPresence: (presence: 'available' | 'unavailable', instanceName?: string) => Promise<void>;
    restart: (instanceName?: string) => Promise<void>;
    logout: (instanceName?: string) => Promise<void>;
    delete: (instanceName?: string) => Promise<void>;
  };
  message: {
    sendText: (params: TextMessageParams, instanceName?: string) => Promise<SendMessageResult>;
    sendMedia: (params: MediaMessageParams, instanceName?: string) => Promise<SendMessageResult>;
    sendWhatsAppAudio: (params: AudioMessageParams, instanceName?: string) => Promise<SendMessageResult>;
    sendSticker: (params: { number: string; sticker: string }, instanceName?: string) => Promise<SendMessageResult>;
    sendLocation: (params: LocationMessageParams, instanceName?: string) => Promise<SendMessageResult>;
    sendContact: (params: { number: string; contact: ContactInfo[] }, instanceName?: string) => Promise<SendMessageResult>;
    sendReaction: (params: { key: MessageKey; reaction: string }, instanceName?: string) => Promise<SendMessageResult>;
    sendPoll: (params: PollMessageParams, instanceName?: string) => Promise<SendMessageResult>;
    sendButtons: (params: ButtonsMessageParams, instanceName?: string) => Promise<SendMessageResult>;
    sendStatus: (params: StatusMessageParams, instanceName?: string) => Promise<SendMessageResult>;
    sendPtv: (params: { number: string; video: string }, instanceName?: string) => Promise<SendMessageResult>;
  };
  chat: {
    findChats: (instanceName?: string) => Promise<ChatContact[]>;
    hasWhatsapp: (params: { numbers: string[] }, instanceName?: string) => Promise<WhatsappNumberStatus[]>;
    findContacts: (params?: { where?: { id?: string } }, instanceName?: string) => Promise<Contact[]>;
    markAsRead: (params: MarkAsReadParams, instanceName?: string) => Promise<void>;
    markChatUnread: (params: { chat: string; lastMessage: { key: MessageKey } }, instanceName?: string) => Promise<void>;
    archiveChat: (params: { chat: string; archive: boolean; lastMessage: { key: MessageKey } }, instanceName?: string) => Promise<void>;
    deleteMessage: (params: { id: string; remoteJid: string; fromMe: boolean; participant?: string }, instanceName?: string) => Promise<void>;
    updateMessage: (params: { number: string; key: MessageKey; text: string }, instanceName?: string) => Promise<void>;
    sendPresence: (params: { number: string; presence: 'composing' | 'recording' | 'paused'; delay?: number }, instanceName?: string) => Promise<void>;
    updateBlockStatus: (params: { number: string; status: 'block' | 'unblock' }, instanceName?: string) => Promise<void>;
    fetchProfilePictureUrl: (number: string, instanceName?: string) => Promise<{ profilePictureUrl: string }>;
    getBase64FromMedia: (params: { message: { key: { id: string } } }, instanceName?: string) => Promise<{ base64: string; mimetype: string }>;
    findMessages: (params?: { where?: { key?: { remoteJid?: string; id?: string } }; page?: number; offset?: number }, instanceName?: string) => Promise<Message[]>;
    findStatusMessage: (params?: { where?: { id?: string } }, instanceName?: string) => Promise<unknown[]>;
  };
  group: {
    fetchAll: (getParticipants?: boolean, instanceName?: string) => Promise<GroupInfo[]>;
    findById: (groupJid: string, instanceName?: string) => Promise<GroupInfo>;
    create: (params: { subject: string; description?: string; participants: string[] }, instanceName?: string) => Promise<GroupInfo>;
    updatePicture: (groupJid: string, imageUrl: string, instanceName?: string) => Promise<void>;
    updateSubject: (groupJid: string, subject: string, instanceName?: string) => Promise<void>;
    updateDescription: (groupJid: string, description: string, instanceName?: string) => Promise<void>;
    fetchInviteCode: (groupJid: string, instanceName?: string) => Promise<{ inviteCode: string }>;
    revokeInviteCode: (groupJid: string, instanceName?: string) => Promise<{ inviteCode: string }>;
    sendInvite: (params: { groupJid: string; description: string; numbers: string[] }, instanceName?: string) => Promise<void>;
    findByInviteCode: (inviteCode: string, instanceName?: string) => Promise<GroupInfo>;
    findParticipants: (groupJid: string, instanceName?: string) => Promise<Participant[]>;
    updateParticipant: (groupJid: string, params: { action: 'add' | 'remove' | 'promote' | 'demote'; participants: string[] }, instanceName?: string) => Promise<void>;
    updateSetting: (groupJid: string, params: { action: 'announcement' | 'not_announcement' | 'locked' | 'unlocked' }, instanceName?: string) => Promise<void>;
    toggleEphemeral: (groupJid: string, expiration: number, instanceName?: string) => Promise<void>;
    leave: (groupJid: string, instanceName?: string) => Promise<void>;
  };
  profile: {
    fetchProfile: (number: string, instanceName?: string) => Promise<Profile>;
    fetchBusinessProfile: (number: string, instanceName?: string) => Promise<BusinessProfile>;
    updateName: (name: string, instanceName?: string) => Promise<void>;
    updateStatus: (status: string, instanceName?: string) => Promise<void>;
    updatePicture: (pictureUrl: string, instanceName?: string) => Promise<void>;
    removePicture: (instanceName?: string) => Promise<void>;
    getPrivacy: (instanceName?: string) => Promise<PrivacySettings>;
    updatePrivacy: (settings: Partial<PrivacySettings>, instanceName?: string) => Promise<void>;
  };
  settings: {
    findOptions: (instanceName?: string) => Promise<SettingsOptions>;
    setOptions: (data: Partial<SettingsOptions>, instanceName?: string) => Promise<void>;
    findWebhook: (instanceName?: string) => Promise<WebhookSettings>;
    setWebhook: (data: { url: string; byEvents?: boolean; base64?: boolean; events?: string[] }, instanceName?: string) => Promise<void>;
    findWebsocket: (instanceName?: string) => Promise<unknown>;
    setWebsocket: (data: { websocket: { enabled: boolean; events?: string[] } }, instanceName?: string) => Promise<void>;
    findRabbitmq: (instanceName?: string) => Promise<unknown>;
    setRabbitmq: (data: unknown, instanceName?: string) => Promise<void>;
    findChatwoot: (instanceName?: string) => Promise<unknown>;
    setChatwoot: (data: unknown, instanceName?: string) => Promise<void>;
    findTypebot: (instanceName?: string) => Promise<unknown>;
    setTypebot: (data: unknown, instanceName?: string) => Promise<void>;
    changeTypebotStatus: (data: { enabled: boolean; botId: string }, instanceName?: string) => Promise<void>;
  };
  label: {
    findLabels: (instanceName?: string) => Promise<Label[]>;
    handleLabel: (params: { number: string; labelId: string; action: 'add' | 'remove' }, instanceName?: string) => Promise<void>;
  };
  websocket: {
    set: (settings: { websocket: { enabled: boolean; events?: string[] } }, instanceName?: string) => Promise<void>;
    find: (instanceName?: string) => Promise<unknown>;
  };
}

// SDK Response Types
export interface InstanceInfo {
  instanceName: string;
  instanceId?: string;
  integration?: string;
  status?: string;
}

export interface CreateInstanceResult {
  instance: {
    instanceName: string;
    instanceId: string;
    integration: string;
    status: string;
  };
  hash: string;
  qrcode?: QRCodeResult;
}

export interface QRCodeResult {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

export interface ConnectionStateResult {
  instance: string;
  state: 'open' | 'close' | 'connecting';
  statusReason?: number;
}

export interface SendMessageResult {
  key: MessageKey;
  message: Record<string, unknown>;
  messageTimestamp: number;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'ERROR';
  messageType?: string;
}

export interface TextMessageParams {
  number: string;
  text: string;
  delay?: number;
  quoted?: { key: MessageKey };
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
}

export interface MediaMessageParams {
  number: string;
  mediatype: 'image' | 'video' | 'document';
  media: string;
  caption?: string;
  fileName?: string;
  mimetype?: string;
}

export interface AudioMessageParams {
  number: string;
  audio: string;
  encoding?: boolean;
}

export interface LocationMessageParams {
  number: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface ContactInfo {
  fullName: string;
  wuid: string;
  phoneNumber: string;
  organization?: string;
  email?: string;
  url?: string;
}

export interface PollMessageParams {
  number: string;
  name: string;
  selectableCount: number;
  values: string[];
}

export interface ButtonsMessageParams {
  number: string;
  title: string;
  description: string;
  footer?: string;
  buttons: Array<{
    type: 'reply' | 'copy' | 'url' | 'call' | 'pix';
    displayText: string;
    id?: string;
    url?: string;
    phoneNumber?: string;
  }>;
}

export interface StatusMessageParams {
  type: 'text' | 'image' | 'video' | 'audio';
  content: string;
  caption?: string;
  backgroundColor?: string;
  font?: 1 | 2 | 3 | 4 | 5;
  allContacts?: boolean;
  statusJidList?: string[];
}

export interface MessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

export interface MarkAsReadParams {
  readMessages: Array<{
    remoteJid: string;
    fromMe: boolean;
    id: string;
  }>;
}

export interface ChatContact {
  id: string;
  name: string;
  number: string;
  isGroup: boolean;
  isMyContact: boolean;
}

export interface Contact {
  id: string;
  name?: string;
  pushName?: string;
  isBusiness?: boolean;
}

export interface Message {
  key: MessageKey;
  message: Record<string, unknown>;
  messageTimestamp: number;
  status?: string;
  messageType?: string;
}

export interface GroupInfo {
  id: string;
  subject: string;
  subjectOwner?: string;
  subjectTime?: number;
  creation?: number;
  owner?: string;
  desc?: string;
  participants?: Participant[];
}

export interface Participant {
  id: string;
  admin?: 'admin' | 'superadmin' | null;
}

export interface Profile {
  wid: string;
  name: string;
  notify?: string;
  verifiedName?: string;
  imgUrl?: string;
  status?: string;
}

export interface BusinessProfile {
  wid: string;
  name: string;
  isEnterprise?: boolean;
  description?: string;
  email?: string;
  website?: string[];
  category?: string;
}

export interface PrivacySettings {
  readreceipts?: 'all' | 'none';
  profile?: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  status?: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  online?: 'all' | 'match_last_seen';
  last?: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  groupadd?: 'all' | 'contacts' | 'contact_blacklist';
}

export interface SettingsOptions {
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
}

export interface WebhookSettings {
  url: string;
  byEvents?: boolean;
  base64?: boolean;
  events?: string[];
}

export interface Label {
  id: string;
  name: string;
  color?: number;
}

export interface WhatsappNumberStatus {
  number: string;
  exists: boolean;
}
