/**
 * Group management tools (read + admin tier)
 */

import { z } from 'zod';
import { PermissionTier, type ToolDefinition, type ToolContext } from '../types/config.js';
import { WhitelistValidator } from '../security/whitelist.js';

// ============================================================================
// Input Schemas
// ============================================================================

export const GetGroupsSchema = z.object({});

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100).describe('Group name'),
  participants: z.array(z.string()).min(1).max(1024).describe('Participant phone numbers (E.164)'),
});

export const UpdateGroupSchema = z.object({
  groupId: z.string().describe('Group JID'),
  action: z.enum(['add', 'remove']).describe('Action to perform'),
  participants: z.array(z.string()).min(1).max(256).describe('Participant phone numbers (E.164)'),
});

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleGetGroups(
  _params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const groups = await context.sdk.fetchAll();
  return { success: true, data: groups };
}

async function handleCreateGroup(
  params: unknown,
  context: ToolContext & { whitelist: WhitelistValidator }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = CreateGroupSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { name, participants } = parsed.data;

  // Validate all participants are whitelisted
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

  const group = await context.sdk.create({ name, participants });
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

  const { groupId, action, participants } = parsed.data;

  // Validate group is whitelisted
  try {
    context.whitelist.validateOutbound(groupId, true);
  } catch (err) {
    return {
      success: false,
      error: `Security: group ${groupId} is not whitelisted`,
    };
  }

  // Validate all participants are whitelisted
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

  await context.sdk.updateParticipant({ groupId, action, participants });
  return { success: true, data: { groupId, action, participantsModified: participants.length } };
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

export const createGroupTool: ToolDefinition = {
  name: 'whatsapp_create_group',
  description: 'Create a new WhatsApp group with participants',
  requiredTier: PermissionTier.ADMIN,
  inputSchema: CreateGroupSchema,
  handler: handleCreateGroup as ToolDefinition['handler'],
};

export const updateGroupTool: ToolDefinition = {
  name: 'whatsapp_update_group',
  description: 'Add or remove participants from a group',
  requiredTier: PermissionTier.ADMIN,
  inputSchema: UpdateGroupSchema,
  handler: handleUpdateGroup as ToolDefinition['handler'],
};

export const groupTools: ToolDefinition[] = [
  getGroupsTool,
  createGroupTool,
  updateGroupTool,
];
