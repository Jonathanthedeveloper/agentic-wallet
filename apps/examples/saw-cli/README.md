# Solana Agent Wallet CLI (saw-cli)

A command-line wallet tool for **autonomous AI agents** (like OpenClaw, ClawDBot, AgentGPT, etc.) to programmatically manage wallets on Solana.

## What This Is

This CLI is designed for **autonomous AI agents** to:
- Create and manage Solana wallets autonomously
- Execute wallet operations and DeFi interactions
- Handle transfers, airdrops, and balance queries
- Run as an MCP server for agent tool execution

## Who Should Use This

- **AI Agents** (OpenClaw, ClawDBot, etc.) that need wallet functionality
- **Developers** building agent systems that require crypto payments
- **Automation systems** that need to manage Solana wallets

## Requirements

- [Bun](https://bun.sh) runtime (v1.3+)
- Solana private key (base58 encoded)
- RPC endpoint (devnet/mainnet)

## Installation

```bash
# Clone the repository
git clone https://github.com/Jonathanthedeveloper/agentic-wallet.git
cd agent-wallet

# Install dependencies
bun install

# Setup CLI
cd apps/examples/saw-cli
bun install
```

## Quick Start

### Step 1: Set Environment Variables

```bash
export SOLANA_PRIVATE_KEY="your_base58_private_key"
export SOLANA_RPC_URL="https://api.devnet.solana.com"
```

### Step 2: Initialize

```bash
bun run src/index.ts init
```

### Step 3: Create Wallet

```bash
bun run src/index.ts create agent-wallet --key "$SOLANA_PRIVATE_KEY"
```

### Step 4: Use It

```bash
# Get address
bun run src/index.ts address

# Get balance
bun run src/index.ts balance

# Transfer
bun run src/index.ts transfer <recipient> 1

# List available tools
bun run src/index.ts tool list
```

## Agent Integration

### For Autonomous Agents (OpenClaw, ClawDBot, etc.)

Execute CLI commands via shell:

```bash
# Get wallet address
agent-wallet address

# Get balance
agent-wallet balance

# Transfer SOL
agent-wallet transfer <recipient> 0.1

# List all available tools
agent-wallet tool list

# Execute any tool
agent-wallet tool run <tool_name> '{"arg1": "value1"}'
```

### MCP Server Mode

Start as MCP server for MCP-compatible agents:

```bash
agent-wallet serve --wallet my-wallet
```

## Available Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize config |
| `create <name>` | Create wallet |
| `list` | List wallets |
| `select <name>` | Select default |
| `delete <name>` | Delete wallet |
| `address` | Get address |
| `balance` | Get balance |
| `transfer <to> <amount>` | Transfer SOL |
| `airdrop` | Get devnet SOL |
| `tool list` | List all available tools |
| `tool show <name>` | Show tool schema |
| `tool run <name> <json>` | Execute tool |
| `serve` | Start MCP server |

## Tools

Tools are dynamically loaded based on configured plugins. Use `tool list` to see available tools:

```bash
agent-wallet tool list
```

To see a tool's input schema:

```bash
agent-wallet tool show <tool_name>
```

To execute a tool:

```bash
agent-wallet tool run <tool_name> '{"arg1": "value1", "arg2": "value2"}'
```

## Common Token Mints

| Token | Mint |
|-------|------|
| SOL | `So11111111111111111111111111111111111111112` |
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| USDT | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11Mcx8eK1VZKu` |
| JUP | `JUPyiwrYJFskUPiHa7hkeR8VUtkqjberbSOWd91pbT2` |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_PRIVATE_KEY` | Yes | Base58 encoded private key |
| `SOLANA_RPC_URL` | No | RPC URL (default: devnet) |

## Network Options

```bash
agent-wallet --network devnet balance
agent-wallet --network mainnet balance
agent-wallet --network testnet balance
```

## JSON Output

```bash
agent-wallet --json address
agent-wallet --json balance
agent-wallet --json tool list
```

## Security

- Never commit private keys
- Use devnet for testing
- Monitor wallet activity

## Troubleshooting

### "No wallet selected"

```bash
agent-wallet create my-wallet --key "$SOLANA_PRIVATE_KEY"
agent-wallet select my-wallet
```

### "Wallet not found"

Make sure the wallet name matches one from `agent-wallet list`

### Tool execution fails

Verify input JSON is valid:
```bash
agent-wallet tool show <tool_name>
```

## Support

- Documentation: `/apps/docs/content/docs/examples/cli.mdx`
- Issues: GitHub issues
