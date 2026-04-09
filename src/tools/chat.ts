/**
 * Chat and contact management tools (read + send tier)
 */

import { z } from 'zod';
import { PermissionTier, type ToolDefinition, type ToolContext } from '../types/config.js';
import { WhitelistValidator } from '../security/whitelist.js';

// ============================================================================
// Input Schemas
// ============================================================================

export const CheckNumberSchema = z.object({
  phone: z.string().describe('Phone number to check (E.164 format)'),
});

export const GetChatsSchema = z.object({});

export const GetContactsSchema = z.object({
  search: z.string().optional().describe('Search term for contact names'),
});

export const GetMessagesSchema = z.object({
  chatId: z.string().optional().describe('Chat ID to fetch messages from'),
  limit: z.number().int().min(1).max(100).default(50).describe('Maximum messages to return'),
});

export const MarkAsReadSchema = z.object({
  chatId: z.string().describe('Chat ID to mark as read'),
});

export const BlockContactSchema = z.object({
  contactId: z.string().describe('Contact ID to block/unblock'),
  block: z.boolean().default(true).describe('True to block, false to unblock'),
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
  const hasWhatsApp = await context.sdk.hasWhatsApp({ phone });
  return { success: true, data: { phone, hasWhatsApp } };
}

async function handleGetChats(
  _params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const chats = await context.sdk.findChats();
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
  const contacts = await context.sdk.findContacts({ search });
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

  const { chatId, limit } = parsed.data;
  const messages = await context.sdk.findMessages({ chatId, limit });
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

  const { chatId } = parsed.data;
  await context.sdk.markAsRead({ chatId });
  return { success: true, data: { chatId, markedAsRead: true } };
}

async function handleBlockContact(
  params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = BlockContactSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { contactId, block } = parsed.data;
  await context.sdk.updateBlockStatus({ contactId, block });
  return { success: true, data: { contactId, blocked: block } };
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

export const chatTools: ToolDefinition[] = [
  checkNumberTool,
  getChatsTool,
  getContactsTool,
  getMessagesTool,
  markAsReadTool,
  blockContactTool,
];
