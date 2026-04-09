/**
 * YAML Configuration Loader
 * Loads and validates config.yaml with Zod schema
 */

import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { AppConfigSchema, type AppConfigInput } from './schema.js';
import type { AppConfig } from '../types/config.js';

// ============================================================================
// Errors
// ============================================================================

export class ConfigError extends Error {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
    this.name = 'ConfigError';
  }
}

export class ConfigNotFoundError extends ConfigError {
  constructor(path: string) {
    super(`Configuration file not found: ${path}`);
    this.name = 'ConfigNotFoundError';
  }
}

export class ConfigValidationError extends ConfigError {
  constructor(errors: string[]) {
    super(`Invalid configuration:\n${errors.join('\n')}`);
    this.name = 'ConfigValidationError';
  }
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULTS = {
  webhook: {
    port: 3000,
    path: '/webhook',
  },
  whitelist: {
    phones: [],
    groups: [],
    blockUnknown: true,
  },
} as const;

// ============================================================================
// Loader
// ============================================================================

/**
 * Load and validate configuration from YAML file
 * 
 * @param configPath - Path to config.yaml
 * @returns Validated AppConfig
 * @throws ConfigNotFoundError if file doesn't exist
 * @throws ConfigValidationError if validation fails
 */
export function loadConfig(configPath: string): AppConfig {
  let fileContent: string;

  try {
    fileContent = readFileSync(configPath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ConfigNotFoundError(configPath);
    }
    throw new ConfigError(`Failed to read config file: ${(err as Error).message}`);
  }

  let rawConfig: unknown;
  try {
    rawConfig = parse(fileContent);
  } catch (err) {
    throw new ConfigError(`Failed to parse YAML: ${(err as Error).message}`);
  }

  // Apply defaults before validation
  const configWithDefaults = applyDefaults(rawConfig);

  // Validate with Zod
  const result = AppConfigSchema.safeParse(configWithDefaults);

  if (!result.success) {
    const errors = result.error.errors.map(
      (e) => `  - ${e.path.join('.')}: ${e.message}`
    );
    throw new ConfigValidationError(errors);
  }

  return result.data as AppConfig;
}

/**
 * Apply default values to config
 */
function applyDefaults(config: unknown): AppConfigInput {
  if (typeof config !== 'object' || config === null) {
    return config as AppConfigInput;
  }

  const cfg = config as Record<string, unknown>;
  const webhook = cfg.webhook as Record<string, unknown> | undefined;
  const whitelist = cfg.whitelist as Record<string, unknown> | undefined;

  return {
    evolution: cfg.evolution as AppConfigInput['evolution'],
    permissions: cfg.permissions as AppConfigInput['permissions'],
    webhook: {
      port: typeof webhook?.port === 'number' ? webhook.port : DEFAULTS.webhook.port,
      path: typeof webhook?.path === 'string' ? webhook.path : DEFAULTS.webhook.path,
      token: typeof webhook?.token === 'string' ? webhook.token : '',
    },
    whitelist: {
      phones: Array.isArray(whitelist?.phones) ? [...whitelist.phones] as string[] : [...DEFAULTS.whitelist.phones],
      groups: Array.isArray(whitelist?.groups) ? [...whitelist.groups] as string[] : [...DEFAULTS.whitelist.groups],
      blockUnknown: typeof whitelist?.blockUnknown === 'boolean' ? whitelist.blockUnknown : DEFAULTS.whitelist.blockUnknown,
    },
  };
}

// ============================================================================
// CLI Config Path Resolution
// ============================================================================

/**
 * Resolve config path from CLI args or defaults
 */
export function resolveConfigPath(args: string[]): string {
  const configIndex = args.indexOf('--config');
  if (configIndex !== -1 && args[configIndex + 1]) {
    return args[configIndex + 1];
  }

  // Check environment variable
  const envPath = process.env.MCP_WHATSAPP_CONFIG;
  if (envPath) {
    return envPath;
  }

  // Default locations
  const defaultPaths = [
    'config.yaml',
    'config.yml',
    './config.yaml',
    './config.yml',
    `${process.cwd()}/config.yaml`,
    `${process.cwd()}/config.yml`,
  ];

  // We'll return the first default and let loadConfig handle not found
  return defaultPaths[2]; // ./config.yaml
}
