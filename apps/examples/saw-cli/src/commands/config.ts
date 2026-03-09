import { Command } from 'commander';
import { loadConfig, saveConfig, getRpcUrl } from '../storage/config.js';

export const configCommand = new Command('config')
  .description('Manage configuration');

configCommand
  .command('get')
  .description('Show current configuration')
  .action(() => {
    const config = loadConfig();
    console.log(JSON.stringify(config, null, 2));
  });

configCommand
  .command('set-rpc <url>')
  .description('Set custom RPC URL')
  .action((url: string) => {
    const config = loadConfig();
    config.rpcUrl = url;
    config.network = 'custom';
    saveConfig(config);
    console.log(`RPC URL set to: ${url}`);
  });

configCommand
  .command('set-network <network>')
  .description('Set network (mainnet, devnet, testnet)')
  .action((network: string) => {
    if (!['mainnet', 'devnet', 'testnet'].includes(network)) {
      console.error('Invalid network. Use: mainnet, devnet, or testnet');
      process.exit(1);
    }
    const config = loadConfig();
    config.network = network as 'mainnet' | 'devnet' | 'testnet';
    saveConfig(config);
    console.log(`Network set to: ${network}`);
    console.log(`RPC URL: ${getRpcUrl(network)}`);
  });

export { configCommand as configCommandObject };
