/**
 * Group management tools (read + admin tier)
 * Compatible with evolution2-api-sdk 3.0.0
 */

import { z } from 'zod';
import { PermissionTier, type ToolDefinition, type ToolContext } from '../types/config.js';
import { WhitelistValidator } from '../security/whitelist.js';

// ============================================================================
// Input Schemas - Updated for SDK 3.0.0
// ============================================================================

export const GetGroupsSchema = z.object({
  getParticipants: z.boolean().optional().default(false).describe('Include participant details'),
});

export const GetGroupMembersSchema = z.object({
  groupJid: z.string().describe('Group JID (e.g., 123456789@g.us)'),
});

export const CreateGroupSchema = z.object({
  subject: z.string().min(1).max(100).describe('Group name'),
  description: z.string().max(500).optional().describe('Group description'),
  participants: z.array(z.string()).min(1).max(1024).describe('Participant phone numbers (E.164)'),
});

export const UpdateGroupSchema = z.object({
  groupJid: z.string().describe('Group JID'),
  action: z.enum(['add', 'remove', 'promote', 'demote']).describe('Action to perform'),
  participants: z.array(z.string()).min(1).max(256).describe('Participant phone numbers (E.164)'),
});

export const SendGroupMessageSchema = z.object({
  groupJid: z.string().describe('Group JID'),
  text: z.string().min(1).max(4096).describe('Message text'),
});

export const LeaveGroupSchema = z.object({
  groupJid: z.string().describe('Group JID to leave'),
});

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleGetGroups(
  params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = GetGroupsSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { getParticipants } = parsed.data;
  const groups = await context.sdk.group.fetchAll(getParticipants);
  return { success: true, data: groups };
}

async function handleGetGroupMembers(
  params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = GetGroupMembersSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { groupJid } = parsed.data;
  const participants = await context.sdk.group.findParticipants(groupJid);
  return { success: true, data: { groupJid, participants } };
}

async function handleCreateGroup(
  params: unknown,
  context: ToolContext & { whitelist: WhitelistValidator }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = CreateGroupSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { subject, description, participants } = parsed.data;

  for (const phone of participants) {
    try {
      context.whitelist.validateOutbound(phone, false);
    } catch (err) {
      return {
        success: false,
        error: `Security: participant ${phone} is not whitelisted`,
      };
    }
  }

  const group = await context.sdk.group.create({ subject, description, participants });
  return { success: true, data: group };
}

async function handleUpdateGroup(
  params: unknown,
  context: ToolContext & { whitelist: WhitelistValidator }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = UpdateGroupSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { groupJid, action, participants } = parsed.data;

  try {
    context.whitelist.validateOutbound(groupJid, true);
  } catch (err) {
    return { success: false, error: `Security: group ${groupJid} is not whitelisted` };
  }

  for (const phone of participants) {
    try {
      context.whitelist.validateOutbound(phone, false);
    } catch (err) {
      return {
        success: false,
        error: `Security: participant ${phone} is not whitelisted`,
      };
    }
  }

  await context.sdk.group.updateParticipant(groupJid, { action, participants });
  return { success: true, data: { groupJid, action, participantsModified: participants.length } };
}

async function handleSendGroupMessage(
  params: unknown,
  context: ToolContext & { whitelist: WhitelistValidator }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = SendGroupMessageSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { groupJid, text } = parsed.data;

  try {
    context.whitelist.validateOutbound(groupJid, true);
  } catch (err) {
    return { success: false, error: `Security: ${(err as Error).message}` };
  }

  const result = await context.sdk.message.sendText({ number: groupJid, text });
  return { success: true, data: result };
}

async function handleLeaveGroup(
  params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = LeaveGroupSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { groupJid } = parsed.data;
  await context.sdk.group.leave(groupJid);
  return { success: true, data: { groupJid, left: true } };
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const getGroupsTool: ToolDefinition = {
  name: 'whatsapp_get_groups',
  description: 'Get list of all WhatsApp groups',
  requiredTier: PermissionTier.READ,
  inputSchema: GetGroupsSchema,
  handler: handleGetGroups as ToolDefinition['handler'],
};

export const getGroupMembersTool: ToolDefinition = {
  name: 'whatsapp_get_group_members',
  description: 'Get members of a group',
  requiredTier: PermissionTier.READ,
  inputSchema: GetGroupMembersSchema,
  handler: handleGetGroupMembers as ToolDefinition['handler'],
};

export const createGroupTool: ToolDefinition = {
  name: 'whatsapp_create_group',
  description: 'Create a new WhatsApp group with participants',
  requiredTier: PermissionTier.ADMIN,
  inputSchema: CreateGroupSchema,
  handler: handleCreateGroup as ToolDefinition['handler'],
};

export const updateGroupTool: ToolDefinition = {
  name: 'whatsapp_update_group',
  description: 'Add, remove, promote, or demote group participants',
  requiredTier: PermissionTier.ADMIN,
  inputSchema: UpdateGroupSchema,
  handler: handleUpdateGroup as ToolDefinition['handler'],
};

export const sendGroupMessageTool: ToolDefinition = {
  name: 'whatsapp_send_group_message',
  description: 'Send a message to a whitelisted group',
  requiredTier: PermissionTier.SEND,
  inputSchema: SendGroupMessageSchema,
  handler: handleSendGroupMessage as ToolDefinition['handler'],
};

export const leaveGroupTool: ToolDefinition = {
  name: 'whatsapp_leave_group',
  description: 'Leave a group',
  requiredTier: PermissionTier.ADMIN,
  inputSchema: LeaveGroupSchema,
  handler: handleLeaveGroup as ToolDefinition['handler'],
};

export const groupTools: ToolDefinition[] = [
  getGroupsTool,
  getGroupMembersTool,
  createGroupTool,
  updateGroupTool,
  sendGroupMessageTool,
  leaveGroupTool,
];
