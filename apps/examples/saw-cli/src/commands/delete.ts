import { Command } from 'commander';
import inquirer from 'inquirer';
import { deleteWallet, loadWallet } from '../storage/wallet.js';
import { loadConfig, saveConfig } from '../storage/config.js';

export const deleteCommand = new Command('delete')
  .description('Delete a wallet')
  .argument('<name>', 'Wallet name')
  .option('--force', 'Skip confirmation')
  .action(async (name: string, options) => {
    const wallet = loadWallet(name);
    if (!wallet) {
      console.error(`Error: Wallet "${name}" not found`);
      process.exit(1);
    }
    
    let confirmed = options.force;
    
    if (!confirmed) {
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete wallet "${name}"? This cannot be undone.`,
          default: false,
        },
      ]);
      confirmed = answers.confirm;
    }
    
    if (!confirmed) {
      console.log('Cancelled');
      return;
    }
    
    deleteWallet(name);
    
    const config = loadConfig();
    if (config.defaultWallet === name) {
      config.defaultWallet = '';
      saveConfig(config);
    }
    
    console.log(`Wallet "${name}" deleted`);
  });
