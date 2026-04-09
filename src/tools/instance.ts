/**
 * Instance management tools (read + admin tier)
 * Compatible with evolution2-api-sdk 3.0.0
 */

import { z } from 'zod';
import { PermissionTier, type ToolDefinition, type ToolContext } from '../types/config.js';

// ============================================================================
// Input Schemas
// ============================================================================

export const ConnectionStatusSchema = z.object({});

export const SetPresenceSchema = z.object({
  presence: z.enum(['available', 'unavailable']).describe('Presence status'),
});

export const CreateInstanceSchema = z.object({
  instanceName: z.string().min(1).describe('Name for the new instance'),
  integration: z.string().optional().default('WHATSAPP-BAILEYS').describe('Integration type'),
  qrcode: z.boolean().optional().default(true).describe('Generate QR code'),
});

export const ConnectInstanceSchema = z.object({});

export const DisconnectInstanceSchema = z.object({});

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleConnectionStatus(
  _params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const state = await context.sdk.instance.connectionState();
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
  await context.sdk.instance.setPresence(presence);
  return { success: true, data: { presence } };
}

async function handleCreateInstance(
  params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const parsed = CreateInstanceSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: `Invalid params: ${parsed.error.message}` };
  }

  const { instanceName, integration, qrcode } = parsed.data;
  const result = await context.sdk.instance.create({ instanceName, integration, qrcode });
  return { success: true, data: result };
}

async function handleConnectInstance(
  _params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const result = await context.sdk.instance.connect();
  return { success: true, data: result };
}

async function handleDisconnectInstance(
  _params: unknown,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  await context.sdk.instance.logout();
  return { success: true, data: { disconnected: true } };
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
  description: 'Set your presence status (available or unavailable)',
  requiredTier: PermissionTier.ADMIN,
  inputSchema: SetPresenceSchema,
  handler: handleSetPresence as ToolDefinition['handler'],
};

export const createInstanceTool: ToolDefinition = {
  name: 'whatsapp_create_instance',
  description: 'Create a new WhatsApp instance',
  requiredTier: PermissionTier.ADMIN,
  inputSchema: CreateInstanceSchema,
  handler: handleCreateInstance as ToolDefinition['handler'],
};

export const connectTool: ToolDefinition = {
  name: 'whatsapp_connect',
  description: 'Connect to WhatsApp and get QR code',
  requiredTier: PermissionTier.ADMIN,
  inputSchema: ConnectInstanceSchema,
  handler: handleConnectInstance as ToolDefinition['handler'],
};

export const disconnectTool: ToolDefinition = {
  name: 'whatsapp_disconnect',
  description: 'Disconnect from WhatsApp',
  requiredTier: PermissionTier.ADMIN,
  inputSchema: DisconnectInstanceSchema,
  handler: handleDisconnectInstance as ToolDefinition['handler'],
};

export const instanceTools: ToolDefinition[] = [
  connectionStatusTool,
  setPresenceTool,
  createInstanceTool,
  connectTool,
  disconnectTool,
];
