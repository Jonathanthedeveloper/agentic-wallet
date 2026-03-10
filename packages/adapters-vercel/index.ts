import type { AgentTool } from '@agentic-wallet/core';

export interface ToolSource {
  getTools(): AgentTool[];
}

export interface VercelTool {
  description: string;
  inputSchema: AgentTool['inputSchema'];
  execute: AgentTool['execute'];
}

export interface VercelTools {
  [toolName: string]: VercelTool;
}

export function toVercelTools(wallet: { getTools(): AgentTool[] }): VercelTools {
  const tools: Record<string, { description: string; inputSchema: AgentTool['inputSchema']; execute: AgentTool['execute'] }> = {}
  for (const tool of wallet.getTools()) {
    tools[tool.name] = {
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute: tool.execute,
    }
  }
  return tools
}