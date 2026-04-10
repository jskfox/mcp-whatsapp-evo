/**
 * Environment Configuration Loader
 * Loads configuration from environment variables
 */

import { AppConfigSchema, type AppConfigInput } from './schema.js';
import type { AppConfig, PermissionTier } from '../types/config.js';

export class ConfigValidationError extends Error {
  constructor(errors: string[]) {
    super(`Invalid configuration:\n${errors.join('\n')}`);
    this.name = 'ConfigValidationError';
  }
}

// ============================================================================
// Environment Variable Names
// ============================================================================

const ENV_VARS = {
  EVOLUTION_HOST: 'EVOLUTION_HOST',
  EVOLUTION_API_KEY: 'EVOLUTION_API_KEY',
  EVOLUTION_INSTANCE_NAME: 'EVOLUTION_INSTANCE_NAME',
  PERMISSIONS_TIER: 'PERMISSIONS_TIER',
  WHITELIST_ENABLED: 'WHITELIST_ENABLED',
  WHITELIST_PHONES: 'WHITELIST_PHONES',
  WHITELIST_GROUPS: 'WHITELIST_GROUPS',
  WHITELIST_BLOCK_UNKNOWN: 'WHITELIST_BLOCK_UNKNOWN',
  WEBHOOK_PORT: 'WEBHOOK_PORT',
  WEBHOOK_PATH: 'WEBHOOK_PATH',
  WEBHOOK_TOKEN: 'WEBHOOK_TOKEN',
} as const;

// ============================================================================
// Environment Loader
// ============================================================================

function parseBoolean(value: string | undefined): boolean {
  if (value === undefined) return true;
  return value.toLowerCase() === 'true' || value === '1';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parsePhones(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(p => p.trim()).filter(p => p.length > 0);
}

function parseGroups(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(g => g.trim()).filter(g => g.length > 0);
}

/**
 * Load configuration from environment variables
 * 
 * Required environment variables:
 * - EVOLUTION_HOST: URL of the Evolution API server
 * - EVOLUTION_API_KEY: API key for authentication
 * - EVOLUTION_INSTANCE_NAME: Name of the WhatsApp instance
 * 
 * Optional environment variables:
 * - PERMISSIONS_TIER: Permission tier (read, send, admin). Default: admin
 * - WHITELIST_ENABLED: Enable whitelist (true/false). Default: true
 * - WHITELIST_PHONES: Comma-separated list of whitelisted phone numbers (E.164)
 * - WHITELIST_GROUPS: Comma-separated list of whitelisted group JIDs
 * - WHITELIST_BLOCK_UNKNOWN: Block messages from non-whitelisted senders. Default: true
 * - WEBHOOK_PORT: Port for webhook server. Default: 3000
 * - WEBHOOK_PATH: Webhook endpoint path. Default: /webhook
 * - WEBHOOK_TOKEN: Token for webhook authentication
 * 
 * @returns Validated AppConfig
 * @throws ConfigValidationError if required variables are missing or invalid
 */
export function loadConfigFromEnv(): AppConfig {
  // Check required variables
  const errors: string[] = [];

  const host = process.env[ENV_VARS.EVOLUTION_HOST];
  const apiKey = process.env[ENV_VARS.EVOLUTION_API_KEY];
  const instanceName = process.env[ENV_VARS.EVOLUTION_INSTANCE_NAME];

  if (!host) {
    errors.push(`Missing required environment variable: ${ENV_VARS.EVOLUTION_HOST}`);
  }
  if (!apiKey) {
    errors.push(`Missing required environment variable: ${ENV_VARS.EVOLUTION_API_KEY}`);
  }
  if (!instanceName) {
    errors.push(`Missing required environment variable: ${ENV_VARS.EVOLUTION_INSTANCE_NAME}`);
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }

  // Build config object
  const configInput: AppConfigInput = {
    evolution: {
      host: host as string,
      apiKey: apiKey as string,
      instanceName: instanceName as string,
    },
    permissions: {
      tier: (process.env[ENV_VARS.PERMISSIONS_TIER] || 'admin') as PermissionTier,
    },
    whitelist: {
      enabled: parseBoolean(process.env[ENV_VARS.WHITELIST_ENABLED]),
      phones: parsePhones(process.env[ENV_VARS.WHITELIST_PHONES]),
      groups: parseGroups(process.env[ENV_VARS.WHITELIST_GROUPS]),
      blockUnknown: parseBoolean(process.env[ENV_VARS.WHITELIST_BLOCK_UNKNOWN]),
    },
    webhook: {
      port: parseNumber(process.env[ENV_VARS.WEBHOOK_PORT], 3000),
      path: process.env[ENV_VARS.WEBHOOK_PATH] || '/webhook',
      token: process.env[ENV_VARS.WEBHOOK_TOKEN] || '',
    },
  };

  // Validate with Zod
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = AppConfigSchema.safeParse(configInput as any);

  if (!result.success) {
    const zodErrors = result.error.errors.map(
      (e) => `  - ${e.path.join('.')}: ${e.message}`
    );
    throw new ConfigValidationError(zodErrors);
  }

  return result.data as unknown as AppConfig;
}

/**
 * Check if environment is configured (has required vars)
 */
export function isEnvConfigured(): boolean {
  return !!(
    process.env[ENV_VARS.EVOLUTION_HOST] &&
    process.env[ENV_VARS.EVOLUTION_API_KEY] &&
    process.env[ENV_VARS.EVOLUTION_INSTANCE_NAME]
  );
}

/**
 * Get list of required environment variables
 */
export function getRequiredEnvVars(): string[] {
  return [
    `${ENV_VARS.EVOLUTION_HOST} - Evolution API server URL`,
    `${ENV_VARS.EVOLUTION_API_KEY} - API key for authentication`,
    `${ENV_VARS.EVOLUTION_INSTANCE_NAME} - WhatsApp instance name`,
  ];
}
