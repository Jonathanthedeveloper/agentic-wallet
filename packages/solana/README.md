# @agentic-wallet/solana

Solana wallet implementation with plugin support for DeFi protocols.

## Installation

```bash
npm install @agentic-wallet/solana
```

## Quick Start

```ts
import { SolanaAgentWallet, createKeypairProvider } from '@agentic-wallet/solana';
import { pumpfunPlugin, jupiterPlugin, raydiumPlugin } from '@agentic-wallet/solana/plugin';

const wallet = new SolanaAgentWallet({
  provider: createKeypairProvider(process.env.SOLANA_PRIVATE_KEY!),
  rpcUrl: 'https://api.mainnet-beta.solana.com',
}).use(pumpfunPlugin());

// Get tools for AI agent
const tools = wallet.getTools();

// Call methods directly
const tokenInfo = await wallet.methods.pumpfunGetTokenInfo({
  mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixc6RFDMOvYQkFNiT1gx',
});
```

## Built-in Tools

The wallet includes these tools without plugins:

- `solana_get_balance` - Get SOL or SPL token balance
- `solana_transfer` - Transfer SOL or tokens
- `solana_airdrop` - Request devnet SOL airdrop

## Plugins

### Pump.fun

Token creation, bonding curve trading, and fee management.

```ts
.use(pumpfunPlugin())
```

**Common operations:**

```ts
// Create token
await wallet.methods.pumpfunCreateToken({
  name: 'My Token',
  symbol: 'MYTKN',
  uri: 'https://arweave.net/...',
});

// Buy tokens (amount in lamports)
await wallet.methods.pumpfunBuy({
  mint: '...',
  solAmount: '100000000',  // 0.1 SOL
  slippage: 0.05,
});

// Sell tokens (amount in raw units)
await wallet.methods.pumpfunSell({
  mint: '...',
  tokenAmount: '1000000',
  slippage: 0.05,
});

// Get token info
await wallet.methods.pumpfunGetTokenInfo({ mint: '...' });
```

### Jupiter

Token swaps, limit orders, DCA, lending, and prediction markets.

```ts
.use(jupiterPlugin({ apiKey: process.env.JUPITER_API_KEY }))
```

### Raydium

Liquidity pools and farming.

```ts
.use(raydiumPlugin())
```

## Configuration

```ts
const wallet = new SolanaAgentWallet({
  provider: createKeypairProvider(privateKey),
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  commitment: 'confirmed',  // default
  explorerCluster: 'mainnet', // or 'devnet', 'testnet'
});
```

## Creating a Provider

```ts
// From private key string
import { createKeypairProvider } from '@agentic-wallet/solana';
const provider = createKeypairProvider(process.env.PRIVATE_KEY!);

// From Keypair
import { Keypair } from '@solana/web3.js';
const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.KEYPAIR!)));
const provider = (message: Uint8Array) => Promise.resolve(keypair.sign(message));
```

## Plugin Development

Plugins export a `WalletPlugin` that registers methods and tools:

```ts
import type { WalletPlugin, AgentTool } from '@agentic-wallet/core';

export function myPlugin(config?: MyConfig): WalletPlugin<SolanaAgentWallet, MyMethods> {
  return {
    name: 'myPlugin',
    register(wallet) {
      const methods: MyMethods = {
        myMethod: async (input) => { /* ... */ },
      };

      const tools: AgentTool[] = [{
        name: 'my_plugin_method',
        description: 'Does something useful',
        inputSchema: zodSchema,
        execute: (input) => methods.myMethod(input),
      }];

      return { methods, tools };
    },
  };
}
```

## TypeScript

This package is written in TypeScript and exports type definitions for all methods and inputs.

## See Also

- [Plugin API Reference](/docs/chains/solana/plugins)
- [Core Wallet API](/docs/chains/solana/wallet)
- [Examples](/apps/examples)
