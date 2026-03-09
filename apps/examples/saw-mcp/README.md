# Solana Agent Wallet MCP (saw-mcp)

A Model Context Protocol (MCP) server that exposes Solana wallet functionality to **AI agents that support MCP** (Claude Desktop, Cursor, Continue, Roo, Codeium, etc.).

## What This Is

This MCP server provides AI agents with:
- Wallet management (create, manage addresses)
- Token transfers and balance queries
- DeFi operations via dynamically loaded plugins
- Any functionality exposed by configured plugins

## Who Should Use This

- **Claude Desktop** users wanting Solana capabilities
- **Cursor** users building Solana applications
- **Continue** users with VS Code
- **Any AI agent** that supports MCP protocol

## Requirements

- [Bun](https://bun.sh) runtime (v1.3+)
- Claude Desktop, Cursor, or other MCP-compatible agent
- Solana private key
- RPC endpoint

## Installation

```bash
# Clone and setup
git clone https://github.com/Jonathanthedeveloper/agentic-wallet.git
cd agent-wallet

# Install root dependencies
bun install

# Setup MCP example
cd apps/examples/saw-mcp
bun install
```

## Configuration

Create a `.env` file:

```bash
# Required
SOLANA_PRIVATE_KEY="your_base58_private_key"
SOLANA_RPC_URL="https://api.devnet.solana.com"

# Optional - depends on plugins used
JUPITER_API_KEY="your_jupiter_api_key"
```

## Configure Your AI Agent

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "solana-agent-wallet": {
      "command": "bun",
      "args": ["/path/to/agent-wallet/apps/examples/saw-mcp/src/index.ts"],
      "env": {
        "SOLANA_PRIVATE_KEY": "your_private_key_here",
        "SOLANA_RPC_URL": "https://api.devnet.solana.com"
      }
    }
  }
}
```

**Restart Claude** to load the new configuration.

### Cursor

Edit `~/.cursor/config.json`:

```json
{
  "mcpServers": {
    "solana-agent-wallet": {
      "command": "bun",
      "args": ["/path/to/agent-wallet/apps/examples/saw-mcp/src/index.ts"],
      "env": {
        "SOLANA_PRIVATE_KEY": "your_private_key_here",
        "SOLANA_RPC_URL": "https://api.devnet.solana.com"
      }
    }
  }
}
```

### Continue (VS Code)

Edit `~/.continue/config.json`:

```json
{
  "mcpServers": {
    "solana-agent-wallet": {
      "command": "bun",
      "args": ["/path/to/agent-wallet/apps/examples/saw-mcp/src/index.ts"],
      "env": {
        "SOLANA_PRIVATE_KEY": "your_private_key_here",
        "SOLANA_RPC_URL": "https://api.devnet.solana.com"
      }
    }
  }
}
```

### Roo

Edit `~/.roo/roo.json`:

```json
{
  "mcpServers": {
    "solana-agent-wallet": {
      "command": "bun",
      "args": ["/path/to/agent-wallet/apps/examples/saw-mcp/src/index.ts"],
      "env": {
        "SOLANA_PRIVATE_KEY": "your_private_key_here",
        "SOLANA_RPC_URL": "https://api.devnet.solana.com"
      }
    }
  }
}
```

### Codeium

Edit `~/.codeium/galena.json`:

```json
{
  "mcpServers": {
    "solana-agent-wallet": {
      "command": "bun",
      "args": ["/path/to/agent-wallet/apps/examples/saw-mcp/src/index.ts"],
      "env": {
        "SOLANA_PRIVATE_KEY": "your_private_key_here",
        "SOLANA_RPC_URL": "https://api.devnet.solana.com"
      }
    }
  }
}
```

## Test It

In your AI agent, try:

```
What is my wallet address?
What is my SOL balance?
What tools are available?
```

## Available Tools

Tools are dynamically loaded based on configured plugins. Ask your AI agent:

```
What tools do you have access to?
```

Or check the source code in `src/index.ts` to see which plugins are loaded.

## Adding Plugins

Edit `src/index.ts` to add or remove plugins:

```ts
import { jupiterPlugin, raydiumPlugin } from "@agentic-wallet/solana/plugin";

const wallet = new SolanaAgentWallet({
    rpcUrl: process.env.SOLANA_RPC_URL!,
    provider: createKeypairProvider(process.env.SOLANA_PRIVATE_KEY!),
})
.use(jupiterPlugin())
.use(raydiumPlugin());
```

Each plugin adds its own set of tools. See the [Plugins documentation](/docs/chains/solana/plugins) for available plugins.

## Security

- **Never share your private key**
- **Use devnet for testing** first
- **Review transactions** before approving

## Troubleshooting

### Tools not appearing

1. Restart your AI agent completely
2. Check the config file syntax is valid JSON
3. Verify the path to the script is correct
4. Check logs (Claude: `~/Library/Logs/Claude/`)

### Tool execution fails

1. Ensure wallet has sufficient balance
2. Check the input format matches schema
3. Try on devnet first

### Connection refused

1. Ensure bun is in PATH
2. Verify script path is correct
3. Check environment variables are set
