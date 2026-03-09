# @agentic-wallet/core

Chain-agnostic, stateless wallet runtime for composing agent tools with a plugin-based architecture.

## Description

`@agentic-wallet/core` provides the base `AgentWallet`, tool contracts, and plugin interfaces used by chain-specific packages and adapters.

## Installation

```bash
npm install @agentic-wallet/core
```

## Usage

```ts
import { AgentWallet, type WalletPlugin } from '@agentic-wallet/core';
import { z } from 'zod';

const pingPlugin: WalletPlugin<AgentWallet, { ping: () => Promise<string> }> = {
	name: 'ping',
	register() {
		return {
			methods: {
				ping: async () => 'pong',
			},
			tools: [
				{
					name: 'ping',
					description: 'Health check tool',
					inputSchema: z.object({}),
					execute: async () => ({ ok: true }),
				},
			],
		};
	},
};

const wallet = new AgentWallet().use(pingPlugin);
const tools = wallet.getTools();
```

## Related

- `@agentic-wallet/solana` for a concrete chain implementation.
- `@agentic-wallet/adapters-*` packages for framework integration.
