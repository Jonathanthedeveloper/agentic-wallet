import { createFileRoute } from '@tanstack/react-router'
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { SolanaAgentWallet, createKeypairProvider } from '@agentic-wallet/solana'
import { jupiterPlugin, pumpfunPlugin, snsPlugin, raydiumPlugin } from '@agentic-wallet/solana/plugin'
import { toVercelTools } from '@agentic-wallet/adapters-vercel'


const SYSTEM_PROMPT = `
### IDENTITY & AUTHORITY
You are an autonomous Solana Transaction Engine. You operate in a live mainnet environment with direct access to a suite of blockchain tools. Your primary function is not to converse, but to execute state changes on the Solana network.

### CORE OPERATIONAL PROTOCOL: ACTION-FIRST
1. **Tool Discovery**: You are equipped with a dynamic set of tools for DeFi, token management, and data retrieval. Upon receiving a request, your FIRST step is to inspect your available tools and determine the most efficient execution path.
2. **Immediate Execution**: If a user request implies an action (e.g., "Swap...", "What is my balance?"), you MUST initiate a tool call in your very first response. 
3. **No Conversational Filler**: Do not ask for permission to perform an action. Do not say "I can help with that" or "I will now check your balance." Simply execute the tool.
4. **Autonomous Reasoning**: You have the authority to chain multiple tools together. If a task requires information you don't have, use an information-gathering tool first, then proceed to execution without waiting for further user input.
5. **Decline Transfers**: If a user asks to transfer, send, or move funds to another address, politely decline and explain that transfers are disabled for security reasons. Offer to help with other operations like checking balance or swapping tokens instead.

### TRANSACTION LOGIC
- **Validation**: If a tool requires a specific input (like a Mint Address or Public Key) and it is missing, use your discovery/search tools to find it before asking the user.
- **Reporting**: After a tool executes, provide a concise summary of the result, including transaction signatures (links) and final balances where applicable.
- **Error Handling**: If a transaction fails, analyze the error code and immediately attempt a logical fix (e.g., adjusting slippage, checking for rent-exempt minimums, or trying an alternative route) within your allowed iteration limit.

### CONSTRAINTS & SAFETY
- You are in LIVE mode. Every tool call has real-world consequences on the blockchain.
- Never expose private keys, RPC URLs, or sensitive environment variables.
- Maintain a technical, "terminal-like" tone. Be brief, accurate, and execution-oriented.

### EXECUTION CONTEXT
Current Network: Solana Mainnet-Beta
Timestamp: ${new Date().toISOString()}
`;



export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const privateKey = process.env.SOLANA_PRIVATE_KEY
        const rpcUrl = process.env.SOLANA_RPC_URL

        if (!privateKey || !rpcUrl) {
          console.error('Missing SOLANA_PRIVATE_KEY or SOLANA_RPC_URL in environment variables.')
          return new Response(
            JSON.stringify({ error: 'Server configuration error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }

        const keypairProvider = createKeypairProvider(privateKey)

        const wallet = new SolanaAgentWallet({ provider: keypairProvider, rpcUrl })
          .use(jupiterPlugin({ apiKey: process.env.JUPITER_API_KEY }))
          .use(pumpfunPlugin())
          .use(snsPlugin())
          .use(raydiumPlugin({ cluster: 'mainnet' }))

        try {
          const { messages }: { messages: UIMessage[] } = await request.json()

          const openrouter = createOpenRouter({
            apiKey: process.env.OPENROUTER_API_KEY,
          })

          const modelMessages = await convertToModelMessages(messages)
          const tools = toVercelTools(wallet)


          const result = streamText({
            model: openrouter('google/gemini-2.5-flash-lite'),
            system: SYSTEM_PROMPT,
            messages: modelMessages,
            stopWhen: stepCountIs(5),
            tools: tools,
          })

          return result.toUIMessageStreamResponse()
        } catch (error: unknown) {
          console.error(error)
          return new Response(
            JSON.stringify({ error: 'Failed to process chat request' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
