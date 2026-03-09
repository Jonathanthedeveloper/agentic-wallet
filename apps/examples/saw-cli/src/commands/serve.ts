import { Command } from 'commander';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerWithMcp } from '@agentic-wallet/adapters-mcp';
import { createWalletFromName, getCurrentWalletName } from '../wallet/manager.js';

export const serveCommand = new Command('serve')
  .description('Start CLI in server mode for agent integration')
  .option('--wallet <name>', 'Wallet name to use (default: selected wallet)')
  .option('--protocol <protocol>', 'Protocol: mcp, stdio, http', 'mcp')
  .action(async (options) => {
    const walletName = options.wallet || getCurrentWalletName();
    
    if (!walletName) {
      console.error('Error: No wallet specified. Use --wallet or run "agent-wallet select" first.');
      process.exit(1);
    }
    
    const wallet = createWalletFromName(walletName);
    if (!wallet) {
      console.error(`Error: Failed to load wallet "${walletName}" - check encryption key`);
      process.exit(1);
    }
    
    const server = new McpServer({
      name: 'agent-wallet-cli',
      version: '1.0.0',
    });
    
    registerWithMcp(server, wallet);
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`MCP server started with wallet: ${walletName}`);
  });
