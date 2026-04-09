/**
 * Zod schema for AppConfig validation
 * Ensures runtime type safety for YAML configuration
 */

import { z } from 'zod';
import { PermissionTier } from '../types/config.js';

// ============================================================================
// Permission Tier Schema
// ============================================================================

export const PermissionTierSchema = z.enum(['read', 'send', 'admin']);

// ============================================================================
// Evolution API Config Schema
// ============================================================================

export const EvolutionConfigSchema = z.object({
  host: z.string().url({ message: 'Evolution API host must be a valid URL' }),
  apiKey: z.string().min(1, { message: 'Evolution API key is required' }),
  instanceName: z.string().min(1, { message: 'Instance name is required' }),
});

// ============================================================================
// Permissions Config Schema
// ============================================================================

export const PermissionsConfigSchema = z.object({
  tier: PermissionTierSchema,
});

// ============================================================================
// Whitelist Config Schema
// ============================================================================

const E164_REGEX = /^\+?[1-9]\d{1,14}$/;
const JID_REGEX = /^\d+@g\.us$/;

export const WhitelistConfigSchema = z.object({
  phones: z.array(z.string().regex(E164_REGEX, { message: 'Phone must be E.164 format' })),
  groups: z.array(z.string().regex(JID_REGEX, { message: 'Group must be JID format (number@g.us)' })),
  blockUnknown: z.boolean(),
}).refine(
  (data) => data.phones.length > 0 || data.groups.length > 0 || data.blockUnknown === false,
  { message: 'Must have at least one whitelisted phone/group or blockUnknown must be false' }
);

// ============================================================================
// Webhook Config Schema
// ============================================================================

export const WebhookConfigSchema = z.object({
  port: z.number().int().min(1).max(65535),
  path: z.string().startsWith('/'),
  token: z.string().min(8, { message: 'Webhook token must be at least 8 characters' }),
});

// ============================================================================
// Full App Config Schema
// ============================================================================

export const AppConfigSchema = z.object({
  evolution: EvolutionConfigSchema,
  permissions: PermissionsConfigSchema,
  whitelist: WhitelistConfigSchema,
  webhook: WebhookConfigSchema,
});

// ============================================================================
// Schema Exports
// ============================================================================

export type AppConfigInput = z.input<typeof AppConfigSchema>;
export type AppConfigOutput = z.output<typeof AppConfigSchema>;
