# Agentic Wallet

TypeScript framework for AI-controlled crypto wallets with DeFi protocol integration.

## What

Agentic Wallet enables AI agents to autonomously manage crypto assets and interact with DeFi protocols. It provides:

- Wallet creation and key management
- Transaction signing and execution
- Plugin system for DeFi protocols (Jupiter, Raydium, Pump.fun)
- Tool generation for AI agents

## Installation

```bash
npm install @agentic-wallet/solana
```

## Quick Start

```ts
import { SolanaAgentWallet, createKeypairProvider } from '@agentic-wallet/solana';
import { pumpfunPlugin, jupiterPlugin } from '@agentic-wallet/solana/plugin';

const wallet = new SolanaAgentWallet({
  provider: createKeypairProvider(process.env.SOLANA_PRIVATE_KEY!),
  rpcUrl: 'https://api.mainnet-beta.solana.com',
})
  .use(pumpfunPlugin())
  .use(jupiterPlugin());

// Get tools for AI agent
const tools = wallet.getTools();

// Or call methods directly
const result = await wallet.methods.pumpfunBuy({
  mint: '...',
  solAmount: '100000000',
  slippage: 0.05,
});
```

## Supported Protocols

| Protocol | Features |
|----------|----------|
| **Pump.fun** | Token creation, bonding curve trading, fee sharing |
| **Jupiter** | Token swaps, limit orders, DCA, lending, prediction markets |
| **Raydium** | Liquidity pools, farming, staking |

## Packages

| Package | Description |
|---------|-------------|
| `@agentic-wallet/core` | Base wallet classes and types |
| `@agentic-wallet/solana` | Solana implementation with plugins |
| `@agentic-wallet/adapters-vercel` | Vercel AI SDK adapter |
| `@agentic-wallet/adapters-tanstack` | TanStack AI adapter |
| `@agentic-wallet/adapters-mcp` | MCP server adapter |

## Examples

See `apps/examples/` for working implementations:

- `saw-cli` - CLI tool for running wallet commands
- `saw-mcp` - MCP server for Claude Desktop, Cursor, etc.
- `trading-agent` - Autonomous trading agent with TanStack AI

## Documentation

- [Solana Wallet](/docs/chains/solana/wallet)
- [Plugin API](/docs/chains/solana/plugins)
- [Tool Reference](/docs/chains/solana/tools)
- [Architecture](/docs/concepts/architecture)

## Development

```bash
# Install dependencies
npm install

# Build packages
npm run build

# Run tests
npm run test
```
