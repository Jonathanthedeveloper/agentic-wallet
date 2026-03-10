# Autonomous Trading Agent

An autonomous trading agent that uses Vercel AI SDK + OpenRouter + Jupiter to manage a Solana portfolio continuously.

## Features

- **Autonomous loop** - Runs indefinitely, triggering a new AI decision cycle every 60 seconds
- **Vercel AI SDK** - Uses `ai` package with OpenRouter (Gemini 2.5 Pro by default)
- **Jupiter integration** - Swaps, limit orders, lending, and token security checks via the Jupiter plugin
- **Built-in risk rules** - Max 30% concentration per token, always keeps 0.02 SOL for fees, skips flagged tokens
- **Terminal-friendly output** - Formatted markdown with colorized output for easy reading in terminal

## Setup

```bash
cd apps/examples/trading-agent
bun install
```

## Configuration

Create a `.env` file:

```bash
# Required
SOLANA_PRIVATE_KEY=your_base58_private_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional
SOLANA_RPC_URL=https://api.devnet.solana.com  # defaults to devnet
JUPITER_API_KEY=your_jupiter_api_key
```

## Usage

```bash
bun run dev
# or
bun run start
```

## How It Works

Each cycle the agent:

1. Fetches current portfolio holdings
2. Checks prices for held assets plus several high-momentum tokens
3. Runs `jupiter_get_shield` on unfamiliar tokens before trading
4. Decides the best action: swap, limit order, lend idle assets, or hold
5. Executes the action and reports the outcome with a transaction link
6. Summarises portfolio state and P&L

The agent then waits 60 seconds before starting the next cycle.

## Risk Rules (enforced via system prompt)

- Never put more than 30% of total portfolio value in a single non-stable token
- Always keep at least 0.02 SOL for transaction fees
- Skip any token flagged by shield as high-risk (freeze/mint authority without verified info)
- Prefer liquidity and verified tokens over hype

## Available Tools

The agent has access to all Jupiter tools (exposed via `jupiterPlugin`):

- `jupiter_swap` - Execute token swaps
- `jupiter_get_token_price` - Real-time prices
- `jupiter_search_token` - Find tokens by name or address
- `jupiter_get_holdings` - Check portfolio holdings
- `jupiter_create_limit_order` - Place limit orders
- `jupiter_create_recurring_order` - DCA strategies
- `jupiter_lend_deposit` / `jupiter_lend_withdraw` - Yield on idle assets
- `jupiter_get_shield` - Security verification before trading

## Migration from TanStack AI

This example was previously built with TanStack AI but has been migrated to Vercel AI SDK due to reliability issues with tool execution in TanStack AI. If you need TanStack AI support, be aware that tool calls may fail intermittently.

## License

MIT
