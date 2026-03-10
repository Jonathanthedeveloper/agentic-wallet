import 'dotenv/config';
import { createTradingWallet } from './wallet.js';
import { streamText, stepCountIs } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { toVercelTools } from '@agentic-wallet/adapters-vercel';
import chalk from 'chalk';

const SYSTEM_PROMPT = `You are an autonomous trading agent operating on Solana via Jupiter.
Your goal is to grow the wallet's portfolio value over time by making smart, profitable trading decisions.

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
- Estimated portfolio change (in USD)`;

// Simple markdown formatter for terminal output
function formatMarkdown(text: string): string {
    return text
        // Headers
        .replace(/^### (.*$)/gim, chalk.yellow.bold('$1'))
        .replace(/^## (.*$)/gim, chalk.cyan.bold('$1'))
        .replace(/^# (.*$)/gim, chalk.magenta.bold('$1'))
        // Bold
        .replace(/\*\*(.*?)\*\*/g, chalk.bold('$1'))
        // Italic
        .replace(/\*(.*?)\*/g, chalk.italic('$1'))
        // Code blocks
        .replace(/```([\s\S]*?)```/g, chalk.gray('$1'))
        // Inline code
        .replace(/`([^`]+)`/g, chalk.gray('$1'))
        // Bullet points
        .replace(/^\s*[-*]\s+(.*$)/gim, '  ' + chalk.green('•') + ' $1')
        // Links - keep the text, show URL in gray
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ' + chalk.underline.gray('$2'));
}

async function main() {
    console.log(chalk.cyan.bold('\n🤖 Initializing Autonomous Trading Agent...\n'));

    const wallet = createTradingWallet();
    
    const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
    });

    let cycle = 0;

    while (true) {
        console.log(chalk.gray('═'.repeat(70)));
        console.log(chalk.yellow.bold(`📊 Cycle ${cycle}: Market Assessment`));
        console.log(chalk.gray('═'.repeat(70)));
        console.log();

        const result = streamText({
            model: openrouter('google/gemini-2.5-pro'),
            system: SYSTEM_PROMPT,
            messages: [{ 
                role: "user", 
                content: `Cycle ${cycle}: Assess the market and decide on trading actions.` 
            }],
            tools: toVercelTools(wallet),
            stopWhen: stepCountIs(10),
        });

        let fullResponse = '';
        for await (const chunk of result.textStream) {
            fullResponse += chunk;
        }

        // Format and display the response
        console.log(formatMarkdown(fullResponse));
        console.log();

        cycle++;

        // Wait for a bit before the next cycle to avoid spamming
        console.log(chalk.gray('⏳ Waiting 60 seconds before next cycle...'));
        console.log();
        await new Promise(resolve => setTimeout(resolve, 60000));
    }
}

main().catch((error) => {
    console.error(chalk.red.bold('❌ Error:'), error);
    process.exit(1);
});
