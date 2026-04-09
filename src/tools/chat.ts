/**
 * Chat and contact management tools (read + send tier)
 * Compatible with evolution2-api-sdk 3.0.0
 */

import { z } from 'zod';
import { PermissionTier, type ToolDefinition, type ToolContext } from '../types/config.js';

// ============================================================================
// Input Schemas - Updated for SDK 3.0.0
// ============================================================================

export const CheckNumberSchema = z.object({
  phone: z.string().describe('Phone number to check (E.164 format)'),
});

export const GetChatsSchema = z.object({});

export const GetContactsSchema = z.object({
  search: z.string().optional().describe('Search term for contact ID'),
});

export const GetMessagesSchema = z.object({
  chatJid: z.string().optional().describe('Chat JID to fetch messages from'),
  page: z.number().int().min(1).optional().default(1).describe('Page number'),
  offset: z.number().int().min(0).optional().default(0).describe('Number of messages to skip'),
});

export const MarkAsReadSchema = z.object({
  remoteJid: z.string().describe('Remote JID of the chat'),
  id: z.string().describe('Message ID to mark as read'),
  fromMe: z.boolean().default(false).describe('Whether the message was sent by me'),
});

export const BlockContactSchema = z.object({
  number: z.string().describe('Contact number to block/unblock'),
  action: z.enum(['block', 'unblock']).describe('Action to perform'),
});

export const SendPresenceSchema = z.object({
  number: z.string().describe('Number to send presence to'),
  presence: z.enum(['composing', 'recording', 'paused']).describe('Presence type'),
  delay: z.number().int().min(0).optional().describe('Delay in milliseconds'),
});

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleCheckNumber(
  params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = CheckNumberSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { phone } = parsed.data;
  const result = await context.sdk.chat.hasWhatsapp({ numbers: [phone] });
  const status = result[0];
  return { success: true, data: { phone, hasWhatsApp: status.exists } };
}

async function handleGetChats(
  _params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const chats = await context.sdk.chat.findChats();
  return { success: true, data: chats };
}

async function handleGetContacts(
  params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = GetContactsSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { search } = parsed.data;
  const contacts = await context.sdk.chat.findContacts(search ? { where: { id: search } } : undefined);
  return { success: true, data: contacts };
}

async function handleGetMessages(
  params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = GetMessagesSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { chatJid, page, offset } = parsed.data;
  const messages = await context.sdk.chat.findMessages({
    where: chatJid ? { key: { remoteJid: chatJid } } : undefined,
    page,
    offset,
  });
  return { success: true, data: messages };
}

async function handleMarkAsRead(
  params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = MarkAsReadSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { remoteJid, id, fromMe } = parsed.data;
  await context.sdk.chat.markAsRead({
    readMessages: [{ remoteJid, fromMe, id }],
  });
  return { success: true, data: { remoteJid, markedAsRead: true } };
}

async function handleBlockContact(
  params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = BlockContactSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { number, action } = parsed.data;
  await context.sdk.chat.updateBlockStatus({ number, status: action });
  return { success: true, data: { number, blocked: action === 'block' } };
}

async function handleSendPresence(
  params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = SendPresenceSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { number, presence, delay } = parsed.data;
  await context.sdk.chat.sendPresence({ number, presence, delay });
  return { success: true, data: { number, presence } };
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const checkNumberTool: ToolDefinition = {
  name: 'whatsapp_check_number',
  description: 'Check if a phone number has WhatsApp',
  requiredTier: PermissionTier.READ,
  inputSchema: CheckNumberSchema,
  handler: handleCheckNumber as ToolDefinition['handler'],
};

export const getChatsTool: ToolDefinition = {
  name: 'whatsapp_get_chats',
  description: 'Get list of recent chats',
  requiredTier: PermissionTier.READ,
  inputSchema: GetChatsSchema,
  handler: handleGetChats as ToolDefinition['handler'],
};

export const getContactsTool: ToolDefinition = {
  name: 'whatsapp_get_contacts',
  description: 'Search and get contacts',
  requiredTier: PermissionTier.READ,
  inputSchema: GetContactsSchema,
  handler: handleGetContacts as ToolDefinition['handler'],
};

export const getMessagesTool: ToolDefinition = {
  name: 'whatsapp_get_messages',
  description: 'Fetch message history from a chat',
  requiredTier: PermissionTier.READ,
  inputSchema: GetMessagesSchema,
  handler: handleGetMessages as ToolDefinition['handler'],
};

export const markAsReadTool: ToolDefinition = {
  name: 'whatsapp_mark_read',
  description: 'Mark messages in a chat as read',
  requiredTier: PermissionTier.SEND,
  inputSchema: MarkAsReadSchema,
  handler: handleMarkAsRead as ToolDefinition['handler'],
};

export const blockContactTool: ToolDefinition = {
  name: 'whatsapp_block_contact',
  description: 'Block or unblock a contact',
  requiredTier: PermissionTier.ADMIN,
  inputSchema: BlockContactSchema,
  handler: handleBlockContact as ToolDefinition['handler'],
};

export const sendPresenceTool: ToolDefinition = {
  name: 'whatsapp_send_presence',
  description: 'Send typing or recording indicator',
  requiredTier: PermissionTier.SEND,
  inputSchema: SendPresenceSchema,
  handler: handleSendPresence as ToolDefinition['handler'],
};

export const chatTools: ToolDefinition[] = [
  checkNumberTool,
  getChatsTool,
  getContactsTool,
  getMessagesTool,
  markAsReadTool,
  blockContactTool,
  sendPresenceTool,
];
