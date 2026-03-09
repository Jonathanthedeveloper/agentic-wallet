import { Command } from 'commander';
import { createWalletFromName, getCurrentWalletName } from '../wallet/manager.js';

export const transferCommand = new Command('transfer')
  .description('Transfer SOL or SPL tokens')
  .argument('<recipient>', 'Recipient address')
  .argument('<amount>', 'Amount to transfer')
  .option('--token <mint>', 'SPL token mint address (default: SOL)')
  .option('--memo <text>', 'Add memo to transaction')
  .option('--priority-fee <lamports>', 'Set priority fee in lamports')
  .option('--confirm', 'Wait for confirmation', false)
  .action(async (recipient: string, amount: string, options) => {
    const walletName = getCurrentWalletName();
    if (!walletName) {
      console.error('Error: No wallet specified. Use --wallet or run "agent-wallet select" first.');
      process.exit(1);
    }
    
    const wallet = createWalletFromName(walletName);
    if (!wallet) {
      console.error(`Error: Failed to load wallet "${walletName}" - check encryption key`);
      process.exit(1);
    }
    
    try {
      const result = await wallet.transfer({
        to: recipient,
        amount: amount,
        mint: options.token,
        createAssociatedTokenAccount: true,
      });
      
      if (process.argv.includes('--json')) {
        console.log(JSON.stringify(result));
      } else {
        console.log(`Transferred ${result.amount} ${result.mint || 'SOL'} to ${result.to}`);
        console.log(`Signature: ${result.signature}`);
        if (result.explorerUrl) {
          console.log(`Explorer: ${result.explorerUrl}`);
        }
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      process.exit(1);
    }
  });
