import { SolanaAgentWallet, createKeypairProvider } from '@agentic-wallet/solana';
import { jupiterPlugin } from '@agentic-wallet/solana/plugin';

export function createTradingWallet() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const privateKey = process.env.SOLANA_PRIVATE_KEY;
    
    if (!privateKey) {
        throw new Error('SOLANA_PRIVATE_KEY environment variable is required');
    }

    const wallet = new SolanaAgentWallet({
        rpcUrl,
        provider: createKeypairProvider(privateKey),
    }).use(jupiterPlugin({
        apiKey: process.env.JUPITER_API_KEY,
    }));

    return wallet;
}

export type TradingWallet = SolanaAgentWallet;
