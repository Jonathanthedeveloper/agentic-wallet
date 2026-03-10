# SAW Chat - Solana Agent Wallet Chat Interface

A web-based chat UI that allows users to interact with their Solana wallet through a conversational interface, powered by Vercel AI SDK.

## What This Is

A modern chat interface that:
- Provides a user-friendly way to interact with your wallet
- Shows tool execution in real-time with collapsible details
- Supports markdown rendering with syntax highlighting
- Stores wallet credentials locally in the browser
- Uses Vercel AI SDK on the backend for LLM interactions

## Installation

```bash
# Clone and install
git clone https://github.com/Jonathanthedeveloper/agentic-wallet.git
cd agent-wallet

# Install dependencies
bun install

# Go to chat example
cd apps/examples/saw-chat
bun run dev
```

The app will be available at `http://localhost:3000`.

## Configuration

### Environment Variables

Create a `.env` file:

```bash
# Required - your LLM provider
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional
SOLANA_PRIVATE_KEY=your_base58_private_key
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
JUPITER_API_KEY=your_jupiter_api_key
```

### In-App Settings

You can also configure wallet settings directly in the app:

1. Click the **Settings** icon (gear) in the top-right corner
2. Enter your Solana RPC URL
3. Enter your Private Key (Base58)
4. Click Save

Credentials are stored locally in your browser - they're never sent to any server.

## Features

### Clickable Example Prompts

When the chat is empty, you'll see clickable example prompts:
- Check SOL balance
- Swap tokens
- View portfolio
- Check token price

Click any example to start the conversation.

### Real-Time Tool Execution

Tool calls are displayed with:
- Tool name and status (running/success/error)
- Expandable input/output details
- JSON formatting for easy reading

### Markdown Rendering

Messages support full markdown with:
- Headers and bold/italic text
- Code blocks with syntax highlighting
- Links (transaction URLs, etc.)

## Available Actions

Through natural language, you can:

| Action | Example |
|--------|---------|
| Check balance | "What's my SOL balance?" |
| Swap tokens | "Swap 0.1 SOL for USDC" |
| View holdings | "Show me all my tokens" |
| Get prices | "What is the price of BONK?" |
| Transfer | "Send 0.5 SOL to..." |

## Architecture

### Frontend

Built with:
- **TanStack Start** - Full-stack React framework
- **TanStack Router** - File-based routing
- **Vercel AI SDK React** - AI chat integration
- **Tailwind CSS** - Styling

### Backend

The API route (`/api/chat`) handles:
- LLM streaming responses
- Tool execution
- Wallet operations

```typescript
const result = streamText({
  model: openrouter('google/gemini-3-flash-preview'),
  system: SYSTEM_PROMPT,
  messages: modelMessages,
  tools: toVercelTools(wallet),
});
```

## Security

- Private keys are stored in browser localStorage
- Credentials are only sent to the API route, not third parties
- Use devnet for testing
- Never share your private key

## Tech Stack

- **Frontend Framework**: TanStack Start
- **Routing**: TanStack Router
- **AI Integration**: Vercel AI SDK + OpenRouter
- **Styling**: Tailwind CSS
- **Wallet**: @agentic-wallet/solana

## Learn More

- [Documentation](https://github.com/Jonathanthedeveloper/agentic-wallet)
- [TanStack Start](https://tanstack.com/start)
- [Vercel AI SDK](https://sdk.vercel.ai)
