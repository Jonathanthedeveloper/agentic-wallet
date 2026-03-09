---
name: saw-cli
description: Command-line interface for managing Solana agentic wallets. Create wallets, execute trades, check balances, and run DeFi operations via shell commands.
---

# Solana Agent Wallet CLI (saw-cli)

## When to use this skill

Use this skill when you need to:
- Create or manage Solana wallets programmatically
- Execute token swaps and DeFi operations via command line
- Check wallet balances and portfolio status
- Transfer SOL or SPL tokens
- List available DeFi tools and execute them
- Run the wallet as an MCP server for AI agent integration

## Prerequisites

- Bun runtime installed (v1.3+)
- Solana private key (base58 encoded)
- RPC endpoint URL
- Repository cloned and dependencies installed

## Installation

```bash
# Clone the repository
git clone https://github.com/Jonathanthedeveloper/agentic-wallet.git
cd agentic-wallet

# Install dependencies
bun install

# Navigate to CLI
cd apps/examples/saw-cli
bun install
```

## Configuration

Set environment variables:

```bash
export SOLANA_PRIVATE_KEY="your_base58_private_key"
export SOLANA_RPC_URL="https://api.devnet.solana.com"
export JUPITER_API_KEY="optional_jupiter_api_key"
```

## Basic Usage

### Initialize the CLI

```bash
bun run src/index.ts init
```

This sets up the configuration directory and encryption keys.

### Create a Wallet

```bash
# Create from existing private key
bun run src/index.ts create my-wallet --key "$SOLANA_PRIVATE_KEY"

# Or create a new wallet (generates random keypair)
bun run src/index.ts create my-wallet
```

### Wallet Operations

```bash
# Get wallet address
bun run src/index.ts address

# Check balance
bun run src/index.ts balance

# Transfer SOL
bun run src/index.ts transfer <recipient_address> <amount>

# Get devnet SOL (for testing)
bun run src/index.ts airdrop
```

### Tool Execution

List all available tools:

```bash
bun run src/index.ts tool list
```

Show tool schema (required parameters):

```bash
bun run src/index.ts tool show <tool_name>
```

Execute a tool with JSON arguments:

```bash
# Example: Swap tokens
bun run src/index.ts tool run jupiter_swap '{"inputMint":"So11111111111111111111111111111111111111112","outputMint":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","amount":"0.1"}'

# Example: Get token price
bun run src/index.ts tool run jupiter_get_token_price '{"mints":["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]}'

# Example: Check holdings
bun run src/index.ts tool run jupiter_get_holdings '{}'
```

### MCP Server Mode

Run as an MCP server for AI agents:

```bash
bun run src/index.ts serve --wallet my-wallet
```

This starts the server on stdio, accepting MCP protocol commands.

## Available Tools

Tools are dynamically loaded based on configured plugins. Common tools include:

### Jupiter Tools
- `jupiter_swap` - Swap tokens with optimal routing
- `jupiter_get_token_price` - Get real-time token prices
- `jupiter_search_token` - Search tokens by name/symbol
- `jupiter_get_holdings` - Get wallet token balances
- `jupiter_create_limit_order` - Create limit orders
- `jupiter_create_recurring_order` - Set up DCA strategies
- `jupiter_lend_deposit` - Deposit to Jupiter Lend

### Wallet Tools
- `solana_get_balance` - Get SOL/SPL balance
- `solana_transfer` - Transfer tokens
- `solana_request_airdrop` - Request devnet SOL

### Raydium Tools (WIP)
- `raydium_swap_exact_in` - Raydium token swaps
- `raydiumGetSwapPoolsByMints` - Get liquidity pools

## Common Token Mints

| Token | Mint Address |
|-------|--------------|
| SOL | `So11111111111111111111111111111111111111112` |
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| USDT | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11Mcx8eK1VZKu` |
| JUP | `JUPyiwrYJFskUPiHa7hkeR8VUtkqjberbSOWd91pbT2` |

## Advanced Usage

### Network Selection

```bash
# Use devnet (default)
export SOLANA_RPC_URL="https://api.devnet.solana.com"

# Use mainnet
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
```

### JSON Output

For programmatic use:

```bash
bun run src/index.ts --json balance
bun run src/index.ts --json tool list
```

### Multiple Wallets

```bash
# List all wallets
bun run src/index.ts list

# Select default wallet
bun run src/index.ts select my-wallet

# Delete a wallet
bun run src/index.ts delete old-wallet
```

## Troubleshooting

### "No wallet selected"

Create and select a wallet:
```bash
bun run src/index.ts create my-wallet --key "$SOLANA_PRIVATE_KEY"
bun run src/index.ts select my-wallet
```

### "Wallet not found"

Check available wallets:
```bash
bun run src/index.ts list
```

### Tool execution fails

Verify input JSON:
```bash
bun run src/index.ts tool show <tool_name>
```

## Security Notes

- Never commit private keys
- Use devnet for testing
- Keep master encryption key secure
- Monitor wallet activity regularly

## Integration Examples

### With Autonomous Agents (OpenClaw, etc.)

```typescript
async function executeWalletCommand(command: string, args: string[]): Promise<string> {
  const { exec } = require('child_process');
  const cmd = `bun run src/index.ts ${command} ${args.join(' ')}`;
  
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: './apps/examples/saw-cli' }, (error, stdout) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
}

// Usage
const balance = await executeWalletCommand('balance', []);
```

### With Shell Scripts

```bash
#!/bin/bash
cd apps/examples/saw-cli

# Get balance and save to file
bun run src/index.ts --json balance > /tmp/wallet_balance.json

# Check if balance is low, request airdrop
BALANCE=$(cat /tmp/wallet_balance.json | jq '.balance')
if (( $(echo "$BALANCE < 1" | bc -l) )); then
    bun run src/index.ts airdrop
fi
```

## Links

- Repository: https://github.com/Jonathanthedeveloper/agentic-wallet
- Documentation: /apps/docs/content/docs/examples/cli.mdx
- Issues: https://github.com/Jonathanthedeveloper/agentic-wallet/issues
