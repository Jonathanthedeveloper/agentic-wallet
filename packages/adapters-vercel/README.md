# @agentic-wallet/adapters-vercel

Adapter that converts `@agentic-wallet/core` tools to the Vercel AI SDK tool object format.

## Description

`toVercelTools(source)` returns a record keyed by tool name with each tool's `description`, `parameters`, and `execute` handler.

## Installation

```bash
npm install @agentic-wallet/adapters-vercel
```

## Usage

```ts
import { toVercelTools } from '@agentic-wallet/adapters-vercel';

const tools = toVercelTools(wallet);
```

`wallet` must implement `getTools(): AgentTool[]`.

## Related

- `@agentic-wallet/core` for `AgentTool` definitions.
- `@agentic-wallet/adapters-tanstack` for TanStack AI integration.
