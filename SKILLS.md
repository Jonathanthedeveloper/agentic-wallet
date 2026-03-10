# Agentic Wallet Skill

## Overview

This skill provides AI agents with the ability to create and manage autonomous wallets on Solana, execute token swaps, and interact with DeFi protocols.

## When to Use This Skill

Use this skill when:
- Working with autonomous AI agents that need to hold and manage crypto assets
- Building trading agents that execute DeFi operations
- Creating wallets programmatically for AI agents
- Integrating wallet functionality with agent frameworks (MCP, TanStack AI, Vercel AI SDK)
- Executing token swaps, DCA orders, limit orders, or lending operations

## Available Capabilities

### Wallet Management
- Create new wallets programmatically
- Import existing wallets from private keys
- Sign transactions automatically
- Hold SOL and SPL tokens

### DeFi Operations (via Jupiter Plugin)
- Token swaps with optimal routing
- Get token prices and market data
- Search for tokens by name/symbol
- Get wallet holdings
- Create/cancel limit orders
- Create/cancel DCA (recurring) orders
- Lending (deposit/withdraw)
- Prediction market trading

### Domain Operations (via SNS Plugin)
- Register SNS domain names (e.g., "myname.sol")
- Resolve domains to wallet addresses
- Get primary domain for an address
- List domains owned by an address
- Create fixed-price listings for domains
- Buy fixed-price domain listings
- Make/accept/cancel unsolicited offers on domains
- Make/accept/cancel category offers (e.g., 999-club)
- Make/accept/cancel P2P offers

### Integrations
- MCP (Model Context Protocol) adapter
- TanStack AI adapter (with OpenRouter)
- Vercel AI SDK adapter

## Setup Requirements

### Environment Variables
```
SOLANA_PRIVATE_KEY=base58_encoded_private_key
SOLANA_RPC_URL=https://api.devnet.solana.com  # or mainnet
OPENROUTER_API_KEY=your_openrouter_api_key
JUPITER_API_KEY=optional_api_key
```

### Packages
```ts
import { SolanaAgentWallet, createKeypairProvider } from '@agentic-wallet/solana';
import { jupiterPlugin } from '@agentic-wallet/solana/plugin';
```

## Usage Examples

### Create Wallet
```ts
const wallet = new SolanaAgentWallet({
  rpcUrl: 'https://api.devnet.solana.com',
  provider: createKeypairProvider(process.env.SOLANA_PRIVATE_KEY!),
}).use(jupiterPlugin());
```

### Execute Swap
```ts
const result = await wallet.jupiterSwap({
  inputMint: 'So11111111111111111111111111111111111111112', // SOL
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: '1',
});
```

### Get Token Price
```ts
const prices = await wallet.jupiterGetTokenPrice({
  mints: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
});
```

### Register SNS Domain
```ts
const result = await wallet.snsRegisterDomain({
  domain: 'myname.sol',
  space: 0, // optional storage allocation
});
```

### Resolve Domain
```ts
const result = await wallet.snsResolveDomain({
  domain: 'bonfida.sol',
});
// Returns: { domain: 'bonfida.sol', resolvedAddress: '...' }
```

### Get Primary Domain
```ts
const result = await wallet.snsGetPrimaryDomain({
  address: 'CWxi4Xq6...', // optional, uses connected wallet if omitted
});
```

### Make Fixed Price Offer
```ts
const result = await wallet.snsMakeFixedPriceOffer({
  amount: 1000000, // amount in atomic units (1 USDC)
  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
  domain: 'myname.sol',
  seller: '...', // optional, defaults to connected wallet
});
```

### Buy Fixed Price Offer
```ts
const result = await wallet.snsAcceptFixedPriceOffer({
  fixedPriceKey: '...', // the offer account pubkey
  domain: 'myname.sol',
  buyer: '...', // optional, defaults to connected wallet
});
```

### Make Unsolicited Offer
```ts
const result = await wallet.snsMakeUnsolicitedOffer({
  amount: 1000000,
  domain: 'myname.sol',
  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  tokenSource: '...', // ATA of the buyer's funds
});
```

### Accept Unsolicited Offer (Seller)
```ts
const result = await wallet.snsAcceptUnsolicitedOffer({
  offerKey: '...',
  offerOwner: '...', // buyer who made the offer
  domain: 'myname.sol',
  destination: '...', // ATA to receive funds
  offerEscrow: '...', // escrow account from the offer
});
```

## Common Token Mints

| Token | Mint Address |
|-------|--------------|
| SOL | So11111111111111111111111111111111111111112 |
| USDC | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v |
| USDT | Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11Mcx8eK1VZKu |
| JUP | JUPyiwrYJFskUPiHa7hkeR8VUtkqjberbSOWd91pbT2 |

## Security Considerations

- Private keys should NEVER be logged or exposed
- Use devnet for testing before mainnet
- Consider implementing spending limits
- Monitor wallet activity regularly
- Use environment variables for secrets, never commit them

## Bounty Requirements Met

This implementation satisfies the agentic wallet bounty requirements:

- [x] **Programmatic Wallet Creation** - `createKeypairProvider()` creates wallets from private keys
- [x] **Automatic Transaction Signing** - `provider.signTransaction()` signs automatically
- [x] **Hold SOL or SPL tokens** - Full SPL token support via `@solana/spl-token`
- [x] **Interact with protocols** - Jupiter plugin provides DeFi interactions
- [x] **Open-source code** - All code is open source in this repository
- [x] **Clear README and setup instructions** - Included in each example

## Project Structure

Key directories:
- `packages/` - Core packages (core, solana, adapters)
- `apps/examples/` - Example implementations (CLI, MCP)
- `apps/docs/` - Documentation
- `apps/trading-agent/` - Trading agent example
