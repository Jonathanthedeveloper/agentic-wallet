import { Command } from 'commander';
import { createWalletFromName, getCurrentWalletName } from '../wallet/manager.js';

export const balanceCommand = new Command('balance')
  .description('Get wallet balance')
  .argument('[wallet]', 'Wallet name (default: selected wallet)')
  .option('--token <mint>', 'Get SPL token balance for mint address')
  .option('--all', 'Show SOL + all SPL tokens')
  .action(async (walletName?: string, options?: { token?: string; all?: boolean }) => {
    const name = walletName || getCurrentWalletName();
    if (!name) {
      console.error('Error: No wallet specified. Use --wallet or run "agent-wallet select" first.');
      process.exit(1);
    }
    
    const wallet = createWalletFromName(name);
    if (!wallet) {
      console.error(`Error: Failed to load wallet "${name}" - check encryption key`);
      process.exit(1);
    }
    
    try {
      const result = await wallet.balance({
        mint: options?.token,
      });
      
      if (process.argv.includes('--json')) {
        console.log(JSON.stringify(result));
      } else {
        if (result.mint) {
          console.log(`${result.balance} (${result.mint})`);
        } else {
          console.log(`${result.balance} SOL`);
        }
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      process.exit(1);
    }
  });
