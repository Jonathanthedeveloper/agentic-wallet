# Agentic Wallet

TypeScript library for building autonomous AI agent wallets on Solana. AI agents can programmatically create wallets, sign transactions, and interact with DeFi protocols.

## Features

- **Programmatic Wallet Creation** - Generate wallets or import existing keys
- **Automatic Transaction Signing** - Agents execute trades autonomously
- **Plugin System** - Extend with DeFi protocols
- **Multi-Framework Adapters** - MCP, TanStack AI, Vercel AI SDK
- **SPL Token Support** - Hold and transfer any Solana token

## Packages

| Package | Description |
|---------|-------------|
| `@agentic-wallet/core` | Base wallet class and plugin types |
| `@agentic-wallet/solana` | Solana chain implementation |
| `@agentic-wallet/adapters-mcp` | MCP protocol adapter |
| `@agentic-wallet/adapters-tanstack` | TanStack AI adapter |
| `@agentic-wallet/adapters-vercel` | Vercel AI SDK adapter |

## Quick Start

```ts
import { SolanaAgentWallet, createKeypairProvider } from '@agentic-wallet/solana';
import { jupiterPlugin } from '@agentic-wallet/solana/plugin';

const wallet = new SolanaAgentWallet({
  rpcUrl: 'https://api.devnet.solana.com',
  provider: createKeypairProvider(process.env.SOLANA_PRIVATE_KEY!),
}).use(jupiterPlugin());

const result = await wallet.jupiterSwap({
  inputMint: 'So11111111111111111111111111111111111111112', // SOL
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: '1',
});
```

## Plugins

### Jupiter (Recommended)
- Token swaps with optimal routing
- Limit orders and DCA
- Lending (Earn)
- Prediction markets

### Raydium (WIP)
- Liquidity pools
- Farms and staking

## Examples

- [CLI Example](/apps/examples/saw-cli) - For AI agents
- [MCP Example](/apps/examples/saw-mcp) - Model Context Protocol
- [Trading Agent](/apps/trading-agent) - TanStack AI + OpenRouter

## Documentation

See [docs](/apps/docs/content/docs) for full documentation.

## Bounty Requirements

This implementation satisfies the agentic wallet bounty:

- [x] Programmatic wallet creation
- [x] Automatic transaction signing
- [x] Hold SOL or SPL tokens
- [x] Interact with DeFi protocols (Jupiter)
- [x] Open-source code
- [x] Clear README and setup instructions
- [x] SKILLS.md for agents

## License

MIT
