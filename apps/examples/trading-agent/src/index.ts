import 'dotenv/config';
import { createTradingWallet } from './wallet.js';
import { chat, ConstrainedModelMessage, UIMessage } from '@tanstack/ai';
import { openRouterText } from '@tanstack/ai-openrouter';
import { toTanstackTools } from '@agentic-wallet/adapters-tanstack';

async function main() {
    console.log('Initializing Autonomous Trading Agent...\n');

    const wallet = createTradingWallet();

    let cycle = 0;


    while (true) {
        const stream = chat({
            messages: [{ role: "user", content: `Cycle ${cycle}: Assess the market and decide on trading actions.` }],
            adapter: openRouterText("google/gemini-2.5-pro"),
            tools: toTanstackTools(wallet),

            systemPrompts: [`You are an autonomous trading agent operating on Solana via Jupiter.
Your goal is to grow the wallet's portfolio value over time by making smart, profitable trading decisions.

You have access to the following tools:
${wallet.getTools().map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

## Decision process (follow this on every cycle)
1. Fetch holdings to understand the current portfolio.
2. Fetch prices for all held assets plus 3-5 high-momentum tokens.
3. Analyse 24h price changes and liquidity.
4. Before trading an unfamiliar token, run jupiter_get_shield to check for security risks — skip tokens with freeze/mint authority or very low liquidity.
5. Decide on the best action to maximise profit:
   - If a token shows strong positive momentum and the wallet has excess USDC/SOL, swap some into it.
   - If a held token is declining sharply, consider rotating into USDC or a stronger asset.
   - If the portfolio is already well-positioned, place limit orders near key price levels.
   - If idle USDC or SOL exists, consider depositing some into Jupiter Lend to earn yield while waiting.
6. Execute the action and report the outcome with transaction link (if available).
7. Summarise the portfolio state and profit/loss after the action.

## Risk rules
- Never invest more than 30% of total portfolio value in a single non-stable token.
- Always keep at least 0.02 SOL for transaction fees.
- Never trade tokens flagged by shield as high-risk (freeze authority + no verified info).
- Prefer liquidity and verified tokens over hype.

## Output format
After each action cycle report:
- Current portfolio (token, balance, USD value)
- Action taken (swap/limit order/lend/hold) with rationale
- Transaction result or order details
- Estimated portfolio change (in USD)`],
            modelOptions: {
                parallel_tool_calls: true,
                include_reasoning: true
            }
        })

        for await (const chunk of stream) {
            // @ts-ignore
            if (chunk.delta) {
                // @ts-ignorex
                console.log(chunk.delta); // Process delta updates
            }

            // @ts-ignore
            if (chunk.toolName) {
                // @ts-ignore
                console.log(`Tool called: ${chunk.toolName} with input: ${JSON.stringify(chunk.input)}`);
            }

        }

        cycle++;

        // Wait for a bit before the next cycle to avoid spamming
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

}

main().catch(console.error);
