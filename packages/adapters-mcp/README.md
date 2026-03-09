# @agentic-wallet/adapters-mcp

Adapter for registering `@agentic-wallet/core` tools on a Model Context Protocol (MCP) server.

## Description

`registerWithMcp(server, source)` maps every tool returned by `source.getTools()` to MCP `registerTool` handlers, including schema passthrough and execution error handling.

## Installation

```bash
npm install @agentic-wallet/adapters-mcp
```

## Usage

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerWithMcp } from '@agentic-wallet/adapters-mcp';

const server = new McpServer({ name: 'wallet-server', version: '1.0.0' });

registerWithMcp(server, wallet);
```

`wallet` must implement `getTools(): AgentTool[]`.

## Related

- `@agentic-wallet/core` for the `AgentTool` and `ToolSource` model.
