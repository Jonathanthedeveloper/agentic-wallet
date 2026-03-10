# Packages

Monorepo containing the Agentic Wallet SDK packages.

## Packages

| Package | Description |
|---------|-------------|
| `@agentic-wallet/core` | Base wallet classes, types, and interfaces |
| `@agentic-wallet/solana` | Solana implementation with plugins |
| `@agentic-wallet/adapters-mcp` | Model Context Protocol adapter |
| `@agentic-wallet/adapters-tanstack` | TanStack AI adapter |
| `@agentic-wallet/adapters-vercel` | Vercel AI SDK adapter |

## Development

```bash
# Install all dependencies
npm install

# Build all packages
npm run build
```

## Adding a New Plugin

1. Create a new directory in `packages/solana/src/plugins/`
2. Export `WalletPlugin` with methods and tools
3. Add to `packages/solana/src/plugin.ts`
