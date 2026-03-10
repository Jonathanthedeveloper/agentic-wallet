# @agentic-wallet/adapters-tanstack

Adapter that converts `@agentic-wallet/core` tools to TanStack AI tool definitions.

⚠️ **Warning: Tool Execution Issues**

**TanStack AI currently has known issues with executing tool calls.** The AI may fail to properly invoke tools or return inconsistent results. For production use cases requiring reliable tool execution, we recommend using the **Vercel AI SDK** adapter (`@agentic-wallet/adapters-vercel`) instead.

## Description

`toTanstackTools(source)` maps every `AgentTool` from `source.getTools()` to `@tanstack/ai` `toolDefinition(...).server(...)` handlers.

## Installation

```bash
npm install @agentic-wallet/adapters-tanstack
```

## Usage

```ts
import { toTanstackTools } from '@agentic-wallet/adapters-tanstack';

const tools = toTanstackTools(wallet);
```

`wallet` must implement `getTools(): AgentTool[]`.

## Related

- `@agentic-wallet/core` for `AgentTool` definitions.
- `@agentic-wallet/adapters-vercel` for Vercel AI SDK integration.
