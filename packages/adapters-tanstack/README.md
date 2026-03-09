# @agentic-wallet/adapters-tanstack

Adapter that converts `@agentic-wallet/core` tools to TanStack AI tool definitions.

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
