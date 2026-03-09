# Agentic Wallet

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-Devnet-purple.svg)](https://solana.com/)

> **Autonomous AI Wallet Infrastructure for DeFi**

A TypeScript framework for building self-custodial, AI-controlled wallets that can independently manage crypto assets, execute trades, and interact with DeFi protocols across any blockchain.

## What This Library Is

Agentic Wallet provides the infrastructure for AI agents to become autonomous participants in the DeFi ecosystem. Instead of wallets that wait for human approval, this library enables:

- **Self-custodial wallets** that AI agents control
- **Autonomous transaction execution** without human intervention  
- **Direct DeFi protocol integration** (swaps, lending, yield farming)
- **24/7 market monitoring** and automated trading strategies
- **Multi-chain extensibility** via a plugin-based architecture

### Why This Exists

I built Agentic Wallet to solve a fundamental problem: **AI agents need wallets they can actually use.**

Current wallet solutions are built for humans with fingers and patience. AI agents need:
- Programmatic wallet creation and management
- Automatic transaction signing and execution
- Direct access to DeFi primitives
- Framework-agnostic tool integration

This library makes it trivial to create agentic wallets for **any blockchain** with access to **all DeFi tools**. Currently implemented for Solana with full Jupiter integration (swaps, limit orders, DCA, lending, prediction markets).

## Bounty Submission: Autonomous Agent Wallet

This repository is submitted for the Agentic Wallet bounty, demonstrating:

### Functional Requirements
- [x] **Programmatic wallet creation** - Wallets created via code, not UI
- [x] **Automatic transaction signing** - Agents sign and execute autonomously
- [x] **SOL and SPL token support** - Full token standard compliance
- [x] **DeFi protocol interaction** - Live Jupiter integration (swaps, orders, lending)
- [x] **Open-source code** - MIT licensed, fully transparent

### 📚 Documentation & Deep Dive

**Clear Documentation:** Comprehensive guides, API references, and step-by-step tutorials in `/apps/docs/`

**Deep Dive Explanations:**
- [Architecture Overview](/apps/docs/content/docs/concepts/architecture.mdx) - How the plugin system works
- [Security Considerations](/apps/docs/content/docs/concepts/security.mdx) - Why we designed it this way
- [Plugin Development](/apps/docs/content/docs/extending/plugins.mdx) - Build your own DeFi integrations

## 🚀 Working Examples

Three fully-functional implementations demonstrate different use cases:

### 1. CLI Tool (`apps/examples/saw-cli`)
For autonomous agents like OpenClaw, ClawDBot, or any system that can execute shell commands.

```bash
git clone https://github.com/Jonathanthedeveloper/agentic-wallet.git
cd agentic-wallet

# Install dependencies
bun install

# Setup CLI
cd apps/examples/saw-cli
bun install

# Create a wallet
export SOLANA_PRIVATE_KEY="your_base58_key"
bun run src/index.ts create my-wallet --key "$SOLANA_PRIVATE_KEY"

# Start trading!
bun run src/index.ts tool run jupiter_swap '{"inputMint":"SOL_MINT","outputMint":"USDC_MINT","amount":"0.1"}'
```

**What it does:**
- Encrypted wallet storage with master key
- Execute any DeFi tool via CLI commands
- MCP server mode for protocol integration
- Perfect for automation scripts and autonomous agents

### 2. MCP Server (`apps/examples/saw-mcp`)
For AI agents that support the Model Context Protocol (Claude Desktop, Cursor, Continue, Roo, Codeium).

```bash
# Configure your AI agent
cat ~/.config/claude/claude_desktop_config.json
{
  "mcpServers": {
    "solana-wallet": {
      "command": "bun",
      "args": ["/path/to/apps/examples/saw-mcp/src/index.ts"],
      "env": {
        "SOLANA_PRIVATE_KEY": "your_key"
      }
    }
  }
}

# Restart Claude and ask:
# "Swap 0.1 SOL to USDC"
# "What's my portfolio worth?"
# "Set a limit order to buy JUP at $0.80"
```

**What it does:**
- Exposes all wallet tools via MCP protocol
- AI agents can discover and call tools automatically
- Natural language trading ("Buy SOL with 50 USDC")
- Real-time price queries and portfolio analysis

### 3. Autonomous Trading Agent (`apps/examples/trading-agent`)
A production-ready trading bot that hunts for opportunities 24/7.

```bash
cd apps/examples/trading-agent

# Configure environment
cp .env.example .env
# Edit .env with your keys and risk settings

# Start the autonomous agent
bun run src/index.ts

# Watch it analyze markets, find opportunities, and execute trades!
```

**What it does:**
- Continuous market monitoring (every 5 minutes)
- AI-powered trade decisions (TanStack AI + OpenRouter)
- Risk management (position limits, stop losses, circuit breakers)
- Performance tracking (win rate, P&L, drawdown)
- **Dry run mode** to test strategies safely

### ⚠️ Important: Devnet Limitations

I apologize for the limited operations available on devnet:
- Real token swaps are not possible
- All Jupiter features are not available on mainnet
- Airdrops Don't work all the time cause of rate limiting

**To test with real money on mainnet:**
1. Change `SOLANA_RPC_URL` to a mainnet RPC endpoint
2. Ensure your wallet has real SOL
3. Start with very small amounts ($1-5)
4. Use the **dry run mode** first!

## 🔐 Security Architecture

### Why We Don't Handle Key Management in the Base Library

**Separation of Concerns:** The core library (`@agentic-wallet/core`) is intentionally **key-agnostic**. It accepts a provider interface, not private keys directly.

```typescript
// You bring your own key management
const wallet = new SolanaAgentWallet({
  provider: createKeypairProvider(process.env.SOLANA_PRIVATE_KEY!)
  // Could also be: hardware wallet, MPC, AWS KMS, etc.
});
```

**Why this matters:**
1. **Flexibility** - Use hardware wallets, MPC, cloud HSM, or local keys
2. **Security** - No keys stored in library code
3. **Compliance** - Enterprises can use their existing key infrastructure
4. **Auditability** - Clear separation between wallet logic and key storage

### How Security Is Implemented in Examples

Each example demonstrates a different security model:

**CLI Example (`saw-cli`):**
- Encrypted wallet storage with user-defined master key
- Wallets encrypted at rest using AES-256
- Master key never stored, provided at runtime
- Multiple wallet support with isolation

**MCP Example (`saw-mcp`):**
- Keys passed via environment variables only
- No persistence - keys exist only in memory
- Ideal for serverless/edge deployments
- Easy rotation via environment changes

**Trading Agent:**
- Keys via environment (`.env` file - never commit!)
- Circuit breakers stop trading if losses exceed limits
- Position sizing limits prevent over-concentration
- Dry run mode for safe strategy testing

### Security Best Practices

1. **Never commit private keys** - Use `.env` files (included in `.gitignore`)
2. **Test on devnet first** - All examples default to devnet
3. **Use hardware wallets for mainnet** - Implement `SolanaWalletProvider` interface
4. **Monitor and limit** - Set daily loss limits, max position sizes
5. **Start small** - Begin with $1-5 trades, scale gradually

## 📦 Packages

| Package | Description | Status |
|---------|-------------|--------|
| `@agentic-wallet/core` | Chain-agnostic wallet primitives | ✅ Stable |
| `@agentic-wallet/solana` | Solana implementation with Jupiter | ✅ Production |
| `@agentic-wallet/adapters-mcp` | Model Context Protocol adapter | ✅ Production |
| `@agentic-wallet/adapters-tanstack` | TanStack AI integration | ✅ Production |
| `@agentic-wallet/adapters-vercel` | Vercel AI SDK adapter | ✅ Production |

## 🛣️ Future Directions

### Immediate Roadmap
1. **More DeFi Integrations** - Drift, Mango, Solend protocols
2. **Ethereum/EVM Support** - Extend to Ethereum, Polygon, Arbitrum

## 🎓 Learning Resources

- [Getting Started Guide](/apps/docs/content/docs/getting-started/first-wallet.mdx)
- [Architecture Deep Dive](/apps/docs/content/docs/concepts/architecture.mdx)
- [Building Custom Plugins](/apps/docs/content/docs/extending/plugins.mdx)
- [Security Best Practices](/apps/docs/content/docs/concepts/security.mdx)
- [API Reference](/apps/docs/content/docs/reference/core-api.mdx)

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Priority areas:
- EVM chain support
- Additional DeFi protocols
- Security audits
- Documentation improvements
- Example implementations

## 📄 License

MIT - See [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

Built with:
- [TanStack AI](https://tanstack.com/ai) - AI orchestration
- [Jupiter](https://jup.ag/) - Solana liquidity
- [Solana Foundation](https://solana.com/) - Blockchain infrastructure
- [OpenRouter](https://openrouter.ai/) - AI model access

---

**Ready to build autonomous DeFi agents?** Start with the [CLI example](./apps/examples/saw-cli) or jump into the [trading agent](./apps/examples/trading-agent) to see it in action!
