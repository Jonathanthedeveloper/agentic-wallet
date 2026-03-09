import { Command } from 'commander';
import bs58 from 'bs58';
import { loadWallet, decryptPrivateKey } from '../storage/wallet.js';
import { getMasterKey } from '../storage/config.js';

export const adminCommand = new Command('admin')
  .description('Admin commands (requires elevated access)')
  .passThroughOptions();

adminCommand
  .command('export-key <wallet>')
  .description('Export private key (requires sudo or master key)')
  .option('--format <format>', 'Output format: base58, hex, json', 'base58')
  .action((walletName: string, options) => {
    const isSudo = process.getuid && process.getuid() === 0;
    const masterKey = getMasterKey();
    
    if (!isSudo && !masterKey) {
      console.error('Error: This command requires sudo or AGENT_WALLET_KEY to be set.');
      process.exit(1);
    }
    
    const wallet = loadWallet(walletName);
    if (!wallet) {
      console.error(`Error: Wallet "${walletName}" not found`);
      process.exit(1);
    }
    
    try {
      const privateKey = decryptPrivateKey(wallet, masterKey || undefined);
      
      if (options.format === 'hex') {
        const bytes = bs58.decode(privateKey);
        console.log(Buffer.from(bytes).toString('hex'));
      } else if (options.format === 'json') {
        console.log(JSON.stringify({ privateKey, address: wallet.metadata.address }));
      } else {
        console.log(privateKey);
      }
    } catch (error) {
      console.error('Failed to decrypt wallet:', error);
      process.exit(1);
    }
  });

adminCommand
  .command('rotate-key <wallet>')
  .description('Rotate wallet key (generates new keypair, transfers funds)')
  .option('--confirm', 'Skip confirmation')
  .action(async (walletName: string, options) => {
    console.log('Key rotation requires:');
    console.log('1. Generate new keypair');
    console.log('2. Transfer all funds to new address');
    console.log('3. Update wallet storage');
    console.log('\nNot implemented yet - requires fund transfer logic.');
  });

export { adminCommand as adminCommandObject };
