import type { AgentTool } from '@agentic-wallet/core';

export interface ToolSource {
  getTools(): AgentTool[];
}

export interface VercelTool {
  description: string;
  parameters: AgentTool['inputSchema'];
  execute: AgentTool['execute'];
}

export function toVercelTools(source: ToolSource): Record<string, VercelTool> {
  const result: Record<string, VercelTool> = {};

  for (const tool of source.getTools()) {
    result[tool.name] = {
      description: tool.description,
      parameters: tool.inputSchema,
      execute: tool.execute,
    };
  }

  return result;
}
