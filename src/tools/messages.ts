/**
 * Message sending tools (send tier + whitelist-gated)
 */

import { z } from 'zod';
import { PermissionTier, type ToolDefinition, type ToolContext } from '../types/config.js';
import { WhitelistValidator } from '../security/whitelist.js';

// ============================================================================
// Input Schemas
// ============================================================================

export const SendTextSchema = z.object({
  to: z.string().describe('Recipient phone number (E.164 format) or group JID'),
  text: z.string().min(1).max(4096).describe('Message text (max 4096 characters)'),
});

export const SendMediaSchema = z.object({
  to: z.string().describe('Recipient phone number (E.164 format) or group JID'),
  mediaUrl: z.string().url().describe('URL of the media file'),
  caption: z.string().max(1024).optional().describe('Optional caption for the media'),
  mimeType: z.string().optional().describe('MIME type of the media (e.g., image/jpeg)'),
});

export const SendLocationSchema = z.object({
  to: z.string().describe('Recipient phone number (E.164 format) or group JID'),
  latitude: z.number().min(-90).max(90).describe('Latitude coordinate'),
  longitude: z.number().min(-180).max(180).describe('Longitude coordinate'),
  name: z.string().max(100).optional().describe('Optional name for the location'),
  address: z.string().max(200).optional().describe('Optional address'),
});

export const SendContactSchema = z.object({
  to: z.string().describe('Recipient phone number (E.164 format) or group JID'),
  contactId: z.string().describe('Contact ID to send'),
});

export const SendReactionSchema = z.object({
  to: z.string().describe('Message ID to react to'),
  messageId: z.string().describe('The message ID to react to'),
  reaction: z.string().max(50).describe('Reaction emoji'),
});

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleSendText(
  params: unknown,
  context: ToolContext & { whitelist: WhitelistValidator }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = SendTextSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { to, text } = parsed.data;

  // Whitelist check
  const isGroup = to.includes('@g.us');
  try {
    context.whitelist.validateOutbound(to, isGroup);
  } catch (err) {
    return {
      success: false,
      error: `Security: ${(err as Error).message}`,
    };
  }

  // Send via SDK
  const result = await context.sdk.sendText({ to, text });
  return { success: true, data: result };
}

async function handleSendMedia(
  params: unknown,
  context: ToolContext & { whitelist: WhitelistValidator }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = SendMediaSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { to, mediaUrl, caption, mimeType } = parsed.data;

  // Whitelist check
  const isGroup = to.includes('@g.us');
  try {
    context.whitelist.validateOutbound(to, isGroup);
  } catch (err) {
    return {
      success: false,
      error: `Security: ${(err as Error).message}`,
    };
  }

  // Send via SDK
  const result = await context.sdk.sendMedia({ to, mediaUrl, caption, mimeType });
  return { success: true, data: result };
}

async function handleSendLocation(
  params: unknown,
  context: ToolContext & { whitelist: WhitelistValidator }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = SendLocationSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { to, latitude, longitude, name, address } = parsed.data;

  // Whitelist check
  const isGroup = to.includes('@g.us');
  try {
    context.whitelist.validateOutbound(to, isGroup);
  } catch (err) {
    return {
      success: false,
      error: `Security: ${(err as Error).message}`,
    };
  }

  // Send via SDK
  const result = await context.sdk.sendLocation({ to, latitude, longitude, name, address });
  return { success: true, data: result };
}

async function handleSendContact(
  params: unknown,
  context: ToolContext & { whitelist: WhitelistValidator }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = SendContactSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { to, contactId } = parsed.data;

  // Whitelist check
  const isGroup = to.includes('@g.us');
  try {
    context.whitelist.validateOutbound(to, isGroup);
  } catch (err) {
    return {
      success: false,
      error: `Security: ${(err as Error).message}`,
    };
  }

  // Send via SDK
  const result = await context.sdk.sendContact({ to, contactId });
  return { success: true, data: result };
}

async function handleSendReaction(
  params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = SendReactionSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { to, messageId, reaction } = parsed.data;

  // Send via SDK (no whitelist needed - reactions are to existing messages)
  const result = await context.sdk.sendReaction({ to, messageId, reaction });
  return { success: true, data: result };
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const sendTextTool: ToolDefinition = {
  name: 'whatsapp_send_text',
  description: 'Send a text message to a whitelisted phone number or group',
  requiredTier: PermissionTier.SEND,
  inputSchema: SendTextSchema,
  handler: handleSendText as ToolDefinition['handler'],
};

export const sendMediaTool: ToolDefinition = {
  name: 'whatsapp_send_media',
  description: 'Send image, video, or document to a whitelisted phone number or group',
  requiredTier: PermissionTier.SEND,
  inputSchema: SendMediaSchema,
  handler: handleSendMedia as ToolDefinition['handler'],
};

export const sendLocationTool: ToolDefinition = {
  name: 'whatsapp_send_location',
  description: 'Send a location to a whitelisted phone number or group',
  requiredTier: PermissionTier.SEND,
  inputSchema: SendLocationSchema,
  handler: handleSendLocation as ToolDefinition['handler'],
};

export const sendContactTool: ToolDefinition = {
  name: 'whatsapp_send_contact',
  description: 'Send a contact card to a whitelisted phone number or group',
  requiredTier: PermissionTier.SEND,
  inputSchema: SendContactSchema,
  handler: handleSendContact as ToolDefinition['handler'],
};

export const sendReactionTool: ToolDefinition = {
  name: 'whatsapp_send_reaction',
  description: 'React to a message with an emoji',
  requiredTier: PermissionTier.SEND,
  inputSchema: SendReactionSchema,
  handler: handleSendReaction as ToolDefinition['handler'],
};

export const messageTools: ToolDefinition[] = [
  sendTextTool,
  sendMediaTool,
  sendLocationTool,
  sendContactTool,
  sendReactionTool,
];
