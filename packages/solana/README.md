# @agentic-wallet/solana

Solana wallet implementation built on `@solana/web3.js`, with tool generation for native operations and plugins.

## Description

`@agentic-wallet/solana` extends `@agentic-wallet/core` with Solana balance, transfer, and airdrop tools, and supports optional plugins like Raydium, Jupiter, and SNS (Solana Name Service).

## Installation

```bash
npm install @agentic-wallet/solana
```

## Usage

```ts
import { SolanaAgentWallet, createKeypairProvider } from '@agentic-wallet/solana';
import { raydiumPlugin, jupiterPlugin, snsPlugin } from '@agentic-wallet/solana/plugin';

const provider = createKeypairProvider(process.env.SOLANA_PRIVATE_KEY!);

const wallet = new SolanaAgentWallet({
	provider,
	rpcUrl: 'https://api.devnet.solana.com',
})
	.use(raydiumPlugin())
	.use(jupiterPlugin())
	.use(snsPlugin());

const tools = wallet.getTools();
```

## Available Plugins

- **raydiumPlugin** - Raydium DEX integration (liquidity, swaps)
- **jupiterPlugin** - Jupiter aggregator integration (token swaps, DCA, limit orders)
- **snsPlugin** - Solana Name Service integration (domain registration, offers, marketplace)

## Related

- `@agentic-wallet/core` for base wallet and plugin types.
- `@agentic-wallet/adapters-vercel` and `@agentic-wallet/adapters-tanstack` for LLM framework tool adapters.
