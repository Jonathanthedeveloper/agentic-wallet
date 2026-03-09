# Contributing to Agentic Wallet

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/Jonathanthedeveloper/agentic-wallet.git
cd agentic-wallet

# Install dependencies
bun install

# Build packages
bun run build

# Run type checking
bun run typecheck
```

## Project Structure

```
packages/
  core/           - Base wallet abstractions
  solana/         - Solana implementation
  adapters-*      - Framework adapters

apps/
  examples/       - Working examples
  docs/           - Documentation site
```

## Adding New Chains

To add support for a new blockchain:

1. Create package: `packages/<chain-name>/`
2. Implement `AgentWallet` base class
3. Add chain-specific tools
4. Create plugins for major protocols
5. Add examples

See `packages/solana/` for reference implementation.

## Adding Plugins

Plugins extend wallet functionality:

```typescript
export const myPlugin = (config?: Config): WalletPlugin<SolanaAgentWallet, Methods> => ({
  name: 'my-plugin',
  register: (wallet) => {
    // Register tools and methods
    return {
      tools: [...],
      methods: { ... }
    };
  }
});
```

## Code Style

- TypeScript with strict mode
- 2 space indentation
- Descriptive variable names
- JSDoc comments for public APIs

## Testing

- Test on devnet before mainnet
- Include unit tests for new features
- Verify backward compatibility

## Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

## Security

- Never commit private keys
- Report security issues privately
- Follow responsible disclosure

## Questions?

Open an issue or discussion on GitHub.
