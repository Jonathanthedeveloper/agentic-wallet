import { Command } from 'commander';
import { loadWallet } from '../storage/wallet.js';
import { loadConfig, saveConfig } from '../storage/config.js';

export const selectCommand = new Command('select')
  .description('Set the default wallet')
  .argument('<name>', 'Wallet name')
  .action((name: string) => {
    const wallet = loadWallet(name);
    if (!wallet) {
      console.error(`Error: Wallet "${name}" not found`);
      process.exit(1);
    }
    
    const config = loadConfig();
    config.defaultWallet = name;
    saveConfig(config);
    
    console.log(`Default wallet set to: ${name}`);
  });
