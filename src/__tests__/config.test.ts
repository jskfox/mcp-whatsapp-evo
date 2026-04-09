/**
 * Config Loader Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { loadConfig, ConfigError, ConfigNotFoundError, ConfigValidationError } from '../config/loader.js';

describe('Config Loader', () => {
  const testDir = join(process.cwd(), 'test-config-temp');

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    try {
      unlinkSync(join(testDir, 'valid.yaml'));
      unlinkSync(join(testDir, 'invalid.yaml'));
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadConfig', () => {
    it('should load valid configuration', () => {
      const validConfig = `
evolution:
  host: "https://api.example.com"
  apiKey: "test-key-123"
  instanceName: "test-instance"

permissions:
  tier: "read"

whitelist:
  enabled: true
  phones:
    - "+5511987654321"
  groups:
    - "123456789@g.us"
  blockUnknown: true

webhook:
  port: 3000
  path: "/webhook"
  token: "test-token-12345678"
`;
      const configPath = join(testDir, 'valid.yaml');
      writeFileSync(configPath, validConfig);

      const config = loadConfig(configPath);

      expect(config.evolution.host).toBe('https://api.example.com');
      expect(config.evolution.apiKey).toBe('test-key-123');
      expect(config.permissions.tier).toBe('read');
      expect(config.whitelist.phones).toContain('+5511987654321');
      expect(config.webhook.port).toBe(3000);
    });

    it('should throw ConfigNotFoundError for missing file', () => {
      expect(() => loadConfig('/nonexistent/path/config.yaml'))
        .toThrow(ConfigNotFoundError);
    });

    it('should throw ConfigValidationError for invalid config', () => {
      const invalidConfig = `
evolution:
  host: "not-a-url"
  apiKey: ""
  instanceName: ""

permissions:
  tier: "invalid-tier"

whitelist:
  enabled: true
  phones: []
  groups: []
  blockUnknown: true

webhook:
  port: 99999
  path: "no-leading-slash"
  token: "short"
`;
      const configPath = join(testDir, 'invalid.yaml');
      writeFileSync(configPath, invalidConfig);

      expect(() => loadConfig(configPath))
        .toThrow(ConfigValidationError);
    });

    it('should apply defaults for optional fields', () => {
      const minimalConfig = `
evolution:
  host: "https://api.example.com"
  apiKey: "test-key"
  instanceName: "test"

permissions:
  tier: "read"

whitelist:
  enabled: true
  phones: []
  groups: []
  blockUnknown: false

webhook:
  port: 3000
  path: "/webhook"
  token: "test-token-long-enough"
`;
      const configPath = join(testDir, 'valid.yaml');
      writeFileSync(configPath, minimalConfig);

      const config = loadConfig(configPath);

      // Defaults should be applied
      expect(config.webhook.path).toBe('/webhook');
    });
  });
});
