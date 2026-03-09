import type { AgentTool } from '@agentic-wallet/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface ToolSource {
    getTools(): AgentTool[];
}

function toolResult(output: unknown): CallToolResult {
    return {
        content: [
            { type: 'text', text: typeof output === 'string' ? output : JSON.stringify(output) },
        ],
    };
}

function toolError(err: unknown): CallToolResult {
    return {
        content: [{ type: 'text', text: String(err) }],
        isError: true,
    };
}

/**
 * Register all tools from a ToolSource with an MCP server.
 *
 * Each AgentTool's `inputSchema` (a Zod schema) is passed directly to
 * `registerTool`, so the MCP SDK handles JSON Schema generation and
 * input validation automatically.
 */
export function registerWithMcp(server: McpServer, source: ToolSource): void {
    for (const tool of source.getTools()) {
        server.registerTool(
            tool.name,
            {
                description: tool.description,
                inputSchema: tool.inputSchema,
            },
            async (input): Promise<CallToolResult> => {
                try {
                    const result = await tool.execute(input);
                    return toolResult(result);
                } catch (err) {
                    return toolError(err);
                }
            },
        );
    }
}