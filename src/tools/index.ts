/**
 * MCP Tool Registry
 * Registers all tools with the MCP SDK
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PermissionGuard } from '../security/permissions.js';
import { WhitelistValidator } from '../security/whitelist.js';
import { messageTools, sendTextTool, sendMediaTool, sendLocationTool, sendContactTool, sendReactionTool } from './messages.js';
import { instanceTools, connectionStatusTool, setPresenceTool } from './instance.js';
import { chatTools, checkNumberTool, getChatsTool, getContactsTool, getMessagesTool, markAsReadTool, blockContactTool } from './chat.js';
import { groupTools, getGroupsTool, createGroupTool, updateGroupTool } from './group.js';
import type { ToolDefinition, ToolContext, AppConfig, EvolutionSDK } from '../types/config.js';

// ============================================================================
// Registry
// ============================================================================

export interface ToolRegistry {
  server: Server;
  tools: ToolDefinition[];
}

/**
 * Create and configure the MCP server with all tools
 */
export function createToolRegistry(
  config: AppConfig,
  sdk: EvolutionSDK
): ToolRegistry {
  // Create security components
  const permissionGuard = new PermissionGuard(config.permissions.tier);
  const whitelistValidator = new WhitelistValidator(config.whitelist);

  // Combine all tools
  const allTools: ToolDefinition[] = [
    // Message tools
    ...messageTools,
    // Instance tools
    ...instanceTools,
    // Chat tools
    ...chatTools,
    // Group tools
    ...groupTools,
  ];

  // Create tool context (passed to all handlers)
  const toolContext: ToolContext = {
    config,
    sdk,
  };

  // Extended context with whitelist for tools that need it
  const extendedContext = {
    ...toolContext,
    whitelist: whitelistValidator,
  };

  // Create MCP server
  const server = new Server(
    {
      name: 'whatsapp-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Find the tool
    const tool = allTools.find((t) => t.name === name);
    if (!tool) {
      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
    }

    // Check permission
    if (!permissionGuard.hasPermission(tool.requiredTier)) {
      return {
        content: [
          {
            type: 'text',
            text: `Permission denied: requires '${tool.requiredTier}' tier but agent has '${config.permissions.tier}' tier`,
          },
        ],
        isError: true,
      };
    }

    // Execute tool handler
    try {
      // Use extended context for whitelist-requiring tools
      const context = tool.name.includes('send') || tool.name.includes('group')
        ? extendedContext
        : toolContext;

      const result = await tool.handler(args || {}, context);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: result.error || 'Tool execution failed',
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return {
    server,
    tools: allTools,
  };
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(registry: ToolRegistry): Promise<void> {
  const transport = new StdioServerTransport();
  await registry.server.connect(transport);
}

// ============================================================================
// Re-export all tools for convenience
// ============================================================================

export {
  // Messages
  sendTextTool,
  sendMediaTool,
  sendLocationTool,
  sendContactTool,
  sendReactionTool,
  messageTools,
  // Instance
  connectionStatusTool,
  setPresenceTool,
  instanceTools,
  // Chat
  checkNumberTool,
  getChatsTool,
  getContactsTool,
  getMessagesTool,
  markAsReadTool,
  blockContactTool,
  chatTools,
  // Groups
  getGroupsTool,
  createGroupTool,
  updateGroupTool,
  groupTools,
};
