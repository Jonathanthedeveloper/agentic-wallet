import { Command } from 'commander';
import { getWalletAddressForName, getCurrentWalletName } from '../wallet/manager.js';

export const addressCommand = new Command('address')
  .description('Display wallet address')
  .argument('[wallet]', 'Wallet name (default: selected wallet)')
  .action((walletName?: string) => {
    const name = walletName || getCurrentWalletName();
    if (!name) {
      console.error('Error: No wallet specified. Use --wallet or run "agent-wallet select" first.');
      process.exit(1);
    }
    
    const address = getWalletAddressForName(name);
    if (!address) {
      console.error(`Error: Wallet "${name}" not found`);
      process.exit(1);
    }
    
    console.log(address);
  });
