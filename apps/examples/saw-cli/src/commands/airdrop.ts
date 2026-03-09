import { Command } from 'commander';
import { createWalletFromName, getCurrentWalletName } from '../wallet/manager.js';

export const airdropCommand = new Command('airdrop')
  .description('Request SOL airdrop (devnet/testnet only)')
  .argument('[amount]', 'Amount of SOL to airdrop', '1')
  .action(async (amount: string) => {
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
      const result = await wallet.requestAirdrop({ amount });
      
      if (process.argv.includes('--json')) {
        console.log(JSON.stringify(result));
      } else {
        console.log(`Airdropped ${result.amount} SOL to ${result.address}`);
        console.log(`Signature: ${result.signature}`);
        if (result.explorerUrl) {
          console.log(`Explorer: ${result.explorerUrl}`);
        }
      }
    } catch (error) {
      console.error('Airdrop failed:', error);
      process.exit(1);
    }
  });
