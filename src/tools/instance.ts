/**
 * Instance management tools (read + admin tier)
 */

import { z } from 'zod';
import { PermissionTier, type ToolDefinition, type ToolContext } from '../types/config.js';

// ============================================================================
// Input Schemas
// ============================================================================

export const ConnectionStatusSchema = z.object({});

export const SetPresenceSchema = z.object({
  presence: z.enum(['available', 'unavailable', 'composing', 'recording', 'paused']),
});

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleConnectionStatus(
  _params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const state = await context.sdk.connectionState();
  return { success: true, data: state };
}

async function handleSetPresence(
  params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = SetPresenceSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { presence } = parsed.data;
  await context.sdk.setPresence(presence as 'available' | 'unavailable' | 'composing' | 'recording' | 'paused');
  return { success: true, data: { presence } };
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const connectionStatusTool: ToolDefinition = {
  name: 'whatsapp_connection_status',
  description: 'Get the current WhatsApp connection status',
  requiredTier: PermissionTier.READ,
  inputSchema: ConnectionStatusSchema,
  handler: handleConnectionStatus as ToolDefinition['handler'],
};

export const setPresenceTool: ToolDefinition = {
  name: 'whatsapp_set_presence',
  description: 'Set your presence status (available, unavailable, typing, etc.)',
  requiredTier: PermissionTier.ADMIN,
  inputSchema: SetPresenceSchema,
  handler: handleSetPresence as ToolDefinition['handler'],
};

export const instanceTools: ToolDefinition[] = [
  connectionStatusTool,
  setPresenceTool,
];
