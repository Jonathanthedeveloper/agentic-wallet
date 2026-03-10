# @agentic-wallet/solana

Solana wallet implementation built on `@solana/web3.js`, with tool generation for native operations and plugins.

## Description

`@agentic-wallet/solana` extends `@agentic-wallet/core` with Solana balance, transfer, and airdrop tools, and supports optional plugins like Raydium, Jupiter, and Pump.fun.

## Installation

```bash
npm install @agentic-wallet/solana
```

## Usage

```ts
import { SolanaAgentWallet, createKeypairProvider } from '@agentic-wallet/solana';
import { raydiumPlugin, jupiterPlugin, pumpfunPlugin } from '@agentic-wallet/solana/plugin';

const provider = createKeypairProvider(process.env.SOLANA_PRIVATE_KEY!);

const wallet = new SolanaAgentWallet({
	provider,
	rpcUrl: 'https://api.mainnet-beta.solana.com',
})
	.use(raydiumPlugin())
	.use(jupiterPlugin())
	.use(pumpfunPlugin());

const tools = wallet.getTools();
```

## Plugins

### Pump.fun Plugin

Full-featured plugin for the Pump.fun protocol on Solana — token creation, bonding curve trading, fee sharing, and rewards.

```ts
import { pumpfunPlugin } from '@agentic-wallet/solana/plugin';

const wallet = new SolanaAgentWallet({ ... }).use(pumpfunPlugin());
```

#### Tools

| Tool | Description |
|------|-------------|
| `pumpfun_create_token` | Create a new token on the Pump.fun bonding curve |
| `pumpfun_buy` | Buy tokens from a bonding curve using SOL |
| `pumpfun_sell` | Sell tokens back to the bonding curve for SOL |
| `pumpfun_get_token_info` | Get comprehensive bonding curve information |
| `pumpfun_get_price` | Get current buy/sell prices |
| `pumpfun_check_graduation` | Check graduation progress to AMM pool |
| `pumpfun_create_fee_config` | Create fee sharing configuration |
| `pumpfun_update_fee_shares` | Update fee distribution among shareholders |
| `pumpfun_get_fee_config` | Get current fee sharing configuration |
| `pumpfun_get_rewards` | Get unclaimed $PUMP token rewards |
| `pumpfun_get_buy_price_impact` | Calculate price impact before buying |
| `pumpfun_get_sell_price_impact` | Calculate price impact before selling |

#### Examples

**Create a Token:**
```ts
const result = await wallet.methods.pumpfunCreateToken({
	name: 'My Token',
	symbol: 'MYTKN',
	uri: 'https://arweave.net/metadata.json',
	mayhemMode: false,
});
// Returns: { mint, signature, explorerUrl }
```

**Buy Tokens:**
```ts
const result = await wallet.methods.pumpfunBuy({
	mint: 'TokenMintAddress...',
	solAmount: '100000000', // 0.1 SOL in lamports
	slippage: 0.05, // 5% slippage
});
// Returns: { signature, explorerUrl, tokenAmount, solAmount }
```

**Sell Tokens:**
```ts
const result = await wallet.methods.pumpfunSell({
	mint: 'TokenMintAddress...',
	tokenAmount: '1000000', // tokens in raw units
	slippage: 0.05,
});
// Returns: { signature, explorerUrl, tokenAmount, solAmount }
```

**Get Token Info:**
```ts
const info = await wallet.methods.pumpfunGetTokenInfo({
	mint: 'TokenMintAddress...',
});
// Returns: { mint, marketCap, tokenTotalSupply, isGraduated, ... }
```

### Jupiter Plugin

Swap tokens, limit orders, DCA, lending, and prediction markets.

```ts
import { jupiterPlugin } from '@agentic-wallet/solana/plugin';

const wallet = new SolanaAgentWallet({ ... }).use(jupiterPlugin({ apiKey: '...' }));
```

### Raydium Plugin

Liquidity pools, farming, and staking on Raydium.

```ts
import { raydiumPlugin } from '@agentic-wallet/solana/plugin';

const wallet = new SolanaAgentWallet({ ... }).use(raydiumPlugin());
```

## Related

- `@agentic-wallet/core` for base wallet and plugin types.
- `@agentic-wallet/adapters-vercel` and `@agentic-wallet/adapters-tanstack` for LLM framework tool adapters.
