import { Command } from 'commander';
import { ensureDirectories, saveConfig, setMasterKey, DEFAULT_CONFIG, loadConfig } from '../storage/config.js';

export const initCommand = new Command('init')
  .description('Initialize agent-wallet configuration')
  .option('--encryption-key <key>', 'Master encryption key (env: AGENT_WALLET_KEY)')
  .option('--force', 'Overwrite existing installation', false)
  .option('--network <cluster>', 'Solana cluster: mainnet, devnet, testnet', 'devnet')
  .action(async (options) => {
    const masterKey = options.encryptionKey || process.env.AGENT_WALLET_KEY;
    
    if (!masterKey) {
      console.error('Error: Master encryption key required.');
      console.error('Set AGENT_WALLET_KEY environment variable or pass --encryption-key');
      process.exit(1);
    }
    
    ensureDirectories();
    setMasterKey(masterKey);
    
    const config = { ...DEFAULT_CONFIG, network: options.network as 'mainnet' | 'devnet' | 'testnet' };
    saveConfig(config);
    
    console.log('Agent wallet initialized successfully!');
    console.log(`Config directory: ${process.env.AGENT_WALLET_HOME || '~/.agent-wallet'}`);
    console.log(`Network: ${options.network}`);
  });
