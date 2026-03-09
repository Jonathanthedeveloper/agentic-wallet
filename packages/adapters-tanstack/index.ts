import type { AgentTool } from '@agentic-wallet/core';
import { toolDefinition } from '@tanstack/ai';

export interface ToolSource {
    getTools(): AgentTool[];
}

export function toTanstackTools(source: ToolSource) {
    return source.getTools().map((tool) =>
        toolDefinition({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
        }).server(async (args) => {
            return tool.execute(args);
        }),
    );
}