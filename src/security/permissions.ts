/**
 * Permission Guard
 * Enforces tier-based access control for MCP tools
 */

import { PermissionTier, hasPermission, type ToolContext } from '../types/config.js';
import type { ToolDefinition, ToolResult } from '../types/config.js';

// ============================================================================
// Errors
// ============================================================================

export class PermissionDeniedError extends Error {
  public readonly isSecurityEvent: true = true;
  public readonly requiredTier: PermissionTier;
  public readonly actualTier: PermissionTier;

  constructor(requiredTier: PermissionTier, actualTier: PermissionTier) {
    super(
      `Permission denied: requires '${requiredTier}' tier but agent has '${actualTier}' tier`
    );
    this.name = 'PermissionDeniedError';
    this.requiredTier = requiredTier;
    this.actualTier = actualTier;
  }
}

// ============================================================================
// Guard
// ============================================================================

export class PermissionGuard {
  private readonly agentTier: PermissionTier;

  constructor(agentTier: PermissionTier) {
    this.agentTier = agentTier;
  }

  /**
   * Get the agent's tier
   */
  getAgentTier(): PermissionTier {
    return this.agentTier;
  }

  /**
   * Check if agent has at least the required tier
   */
  hasPermission(requiredTier: PermissionTier): boolean {
    return hasPermission(this.agentTier, requiredTier);
  }

  /**
   * Assert permission, throwing if insufficient
   * @throws PermissionDeniedError if tier is insufficient
   */
  assertPermission(requiredTier: PermissionTier): void {
    if (!this.hasPermission(requiredTier)) {
      throw new PermissionDeniedError(requiredTier, this.agentTier);
    }
  }

  /**
   * Wrap a tool handler with permission checking
   * Returns error result instead of throwing for MCP compatibility
   */
  withPermissionCheck<T extends ToolDefinition>(
    tool: T,
    handler: (params: unknown, context: ToolContext) => Promise<ToolResult>
  ): (params: unknown, context: ToolContext) => Promise<ToolResult> {
    return async (params: unknown, context: ToolContext): Promise<ToolResult> => {
      // Check permission tier
      if (!this.hasPermission(tool.requiredTier)) {
        return {
          success: false,
          error: `Permission denied: requires '${tool.requiredTier}' tier but agent has '${this.agentTier}' tier`,
        };
      }

      // Execute handler
      return handler(params, context);
    };
  }

  /**
   * Create middleware-style check for use in tool handlers
   */
  createMiddleware(requiredTier: PermissionTier): (
    params: unknown,
    context: ToolContext
  ) => Promise<ToolResult> {
    return async (_params: unknown, _context: ToolContext): Promise<ToolResult> => {
      if (!this.hasPermission(requiredTier)) {
        return {
          success: false,
          error: `Permission denied: requires '${requiredTier}' tier but agent has '${this.agentTier}' tier`,
        };
      }
      return { success: true };
    };
  }
}

// ============================================================================
// Permission Check Utilities
// ============================================================================

/**
 * Get the minimum tier required for a given operation
 */
export function getMinimumTierForOperation(operation: 'read' | 'send' | 'admin'): PermissionTier {
  switch (operation) {
    case 'read':
      return PermissionTier.READ;
    case 'send':
      return PermissionTier.SEND;
    case 'admin':
      return PermissionTier.ADMIN;
  }
}

/**
 * Check if a tier can perform an operation
 */
export function canPerformOperation(tier: PermissionTier, operation: 'read' | 'send' | 'admin'): boolean {
  const required = getMinimumTierForOperation(operation);
  return hasPermission(tier, required);
}

/**
 * Get all tiers below a given tier (for inheritance display)
 */
export function getTiersBelow(tier: PermissionTier): PermissionTier[] {
  const allTiers: PermissionTier[] = [PermissionTier.READ, PermissionTier.SEND, PermissionTier.ADMIN];
  const tierIndex = allTiers.indexOf(tier);
  return allTiers.slice(0, tierIndex);
}

/**
 * Get all tiers above a given tier (for what a higher-tier agent can do)
 */
export function getTiersAbove(tier: PermissionTier): PermissionTier[] {
  const allTiers: PermissionTier[] = [PermissionTier.READ, PermissionTier.SEND, PermissionTier.ADMIN];
  const tierIndex = allTiers.indexOf(tier);
  return allTiers.slice(tierIndex + 1);
}
