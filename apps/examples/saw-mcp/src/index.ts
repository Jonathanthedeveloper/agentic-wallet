import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerWithMcp } from "@agentic-wallet/adapters-mcp";
import { createSolanaKeypairFromSecretKey, createKeypairProvider, SolanaAgentWallet } from "@agentic-wallet/solana"
import { raydiumPlugin , jupiterPlugin} from "@agentic-wallet/solana/plugin";

// Create server instance
const server = new McpServer({
    name: "Solana Agentic Wallet",
    version: "1.0.0",
});

const wallet = new SolanaAgentWallet({
    rpcUrl: process.env.SOLANA_RPC_URL!,
    provider: createKeypairProvider(process.env.SOLANA_PRIVATE_KEY!),
    // Optional: Kora config for custom RPC
    // koraConfig: {
    //     rpcUrl: process.env.KORA_RPC_URL || "http://localhost:8080",
    // }
}).use(raydiumPlugin({
    cluster: "mainnet",
})).use(jupiterPlugin({
    apiKey: process.env.JUPITER_API_KEY,
}));


async function main() {
    registerWithMcp(server, wallet);

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});