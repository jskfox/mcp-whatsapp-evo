/**
 * Message sending tools (send tier + whitelist-gated)
 * Compatible with evolution2-api-sdk 3.0.0
 */

import { z } from 'zod';
import { PermissionTier, type ToolDefinition, type ToolContext } from '../types/config.js';
import { WhitelistValidator } from '../security/whitelist.js';

// ============================================================================
// Input Schemas - Updated for SDK 3.0.0
// ============================================================================

export const SendTextSchema = z.object({
  number: z.string().describe('Recipient phone number (E.164 format) or group JID'),
  text: z.string().min(1).max(4096).describe('Message text (max 4096 characters)'),
  delay: z.number().int().min(0).max(60000).optional().describe('Delay in milliseconds'),
  linkPreview: z.boolean().optional().describe('Enable link preview'),
});

export const SendMediaSchema = z.object({
  number: z.string().describe('Recipient phone number (E.164 format) or group JID'),
  mediatype: z.enum(['image', 'video', 'document']).describe('Media type'),
  media: z.string().describe('URL or base64 of the media file'),
  caption: z.string().max(1024).optional().describe('Optional caption'),
  fileName: z.string().optional().describe('Optional file name'),
});

export const SendLocationSchema = z.object({
  number: z.string().describe('Recipient phone number (E.164 format) or group JID'),
  latitude: z.number().min(-90).max(90).describe('Latitude coordinate'),
  longitude: z.number().min(-180).max(180).describe('Longitude coordinate'),
  name: z.string().max(100).optional().describe('Optional location name'),
  address: z.string().max(200).optional().describe('Optional address'),
});

export const SendContactSchema = z.object({
  number: z.string().describe('Recipient phone number (E.164 format) or group JID'),
  contact: z.array(z.object({
    fullName: z.string(),
    wuid: z.string().describe('WhatsApp ID'),
    phoneNumber: z.string(),
    organization: z.string().optional(),
    email: z.string().optional(),
    url: z.string().optional(),
  })).min(1).describe('Contact information array'),
});

export const SendReactionSchema = z.object({
  remoteJid: z.string().describe('Remote JID of the message'),
  fromMe: z.boolean().describe('Whether the message was sent by me'),
  id: z.string().describe('Message ID to react to'),
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

  const { number, text, delay, linkPreview } = parsed.data;

  const isGroup = number.includes('@g.us');
  try {
    context.whitelist.validateOutbound(number, isGroup);
  } catch (err) {
    return { success: false, error: `Security: ${(err as Error).message}` };
  }

  const result = await context.sdk.message.sendText({ number, text, delay, linkPreview });
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

  const { number, mediatype, media, caption, fileName } = parsed.data;

  const isGroup = number.includes('@g.us');
  try {
    context.whitelist.validateOutbound(number, isGroup);
  } catch (err) {
    return { success: false, error: `Security: ${(err as Error).message}` };
  }

  const result = await context.sdk.message.sendMedia({ number, mediatype, media, caption, fileName });
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

  const { number, latitude, longitude, name, address } = parsed.data;

  const isGroup = number.includes('@g.us');
  try {
    context.whitelist.validateOutbound(number, isGroup);
  } catch (err) {
    return { success: false, error: `Security: ${(err as Error).message}` };
  }

  const result = await context.sdk.message.sendLocation({ 
    number, 
    latitude, 
    longitude, 
    name: name || '', 
    address: address || '' 
  });
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

  const { number, contact } = parsed.data;

  const isGroup = number.includes('@g.us');
  try {
    context.whitelist.validateOutbound(number, isGroup);
  } catch (err) {
    return { success: false, error: `Security: ${(err as Error).message}` };
  }

  const result = await context.sdk.message.sendContact({ number, contact });
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

  const { remoteJid, fromMe, id, reaction } = parsed.data;

  const result = await context.sdk.message.sendReaction({
    key: { remoteJid, fromMe, id },
    reaction,
  });
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
