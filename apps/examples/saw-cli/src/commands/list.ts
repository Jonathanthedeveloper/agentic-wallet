import { Command } from 'commander';
import { listWallets, getWalletAddress } from '../storage/wallet.js';
import { loadConfig, getRpcUrl } from '../storage/config.js';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

export const listCommand = new Command('list')
  .description('List all wallets')
  .option('--show-addresses', 'Display full addresses (default: masked)')
  .option('--show-balances', 'Show balances')
  .action(async (options) => {
    const wallets = listWallets();
    const config = loadConfig();
    const isJson = process.argv.includes('--json');

    if (wallets.length === 0) {
      if (isJson) {
        console.log(JSON.stringify({ wallets: [] }));
      } else {
        console.log('No wallets found. Create one with: agent-wallet create <name>');
      }
      return;
    }

    if (options.showBalances) {
      const connection = new Connection(getRpcUrl());
      for (const wallet of wallets) {
        try {
          const pubkey = new PublicKey(wallet.address);
          const balance = await connection.getBalance(pubkey);
          wallet.address = `${wallet.address.slice(0, 8)}...${wallet.address.slice(-4)}`;
          (wallet as any).balance = (balance / LAMPORTS_PER_SOL).toFixed(4) + ' SOL';
        } catch {
          (wallet as any).balance = 'N/A';
        }
      }
    }

    if (isJson) {
      console.log(JSON.stringify({ wallets }));
      return;
    }

    const defaultWallet = config.defaultWallet;
    console.log('\n┌┬┬┐');
    console.log('│ Name        │ Address            │ Status       │');
    console.log('├┼┼┤');

    for (const wallet of wallets) {
      const displayAddress = options.showAddresses
        ? wallet.address
        : `${wallet.address.slice(0, 8)}...${wallet.address.slice(-4)}`;
      const isDefault = wallet.name === defaultWallet;
      const status = isDefault ? 'default' : '';
      const name = isDefault ? `${wallet.name} *` : wallet.name;
      console.log(`│ ${name.padEnd(11)} │ ${displayAddress.padEnd(18)} │ ${status.padEnd(12)} │`);
    }
    console.log('└┴┴┘');
  });
