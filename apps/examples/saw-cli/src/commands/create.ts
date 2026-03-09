import { Command } from 'commander';
import { Keypair } from '@solana/web3.js';
import { encryptPrivateKey, saveWallet, loadWallet } from '../storage/wallet.js';
import { loadConfig, saveConfig, getMasterKey, ensureDirectories } from '../storage/config.js';
import bs58 from 'bs58';

export const createCommand = new Command('create')
  .description('Create a new wallet')
  .argument('<name>', 'Wallet name (alphanumeric, hyphens, underscores)')
  .option('--seed <phrase>', 'Generate from seed phrase (24 words)')
  .option('--key <privateKey>', 'Import from private key (base58, base64, hex)')
  .action(async (name: string, options) => {
    ensureDirectories();
    
    const existing = loadWallet(name);
    if (existing) {
      console.error(`Error: Wallet "${name}" already exists`);
      process.exit(1);
    }
    
    const masterKey = getMasterKey();
    if (!masterKey) {
      console.error('Error: Master encryption key not set. Run "agent-wallet init" first.');
      process.exit(1);
    }
    
    let keypair: Keypair;
    
    if (options.key) {
      const keyInput = options.key;
      let privateKeyBytes: Uint8Array;
      
      if (keyInput.startsWith('0x')) {
        privateKeyBytes = new Uint8Array(Buffer.from(keyInput.slice(2), 'hex'));
      } else if (/^[0-9a-zA-Z]+$/.test(keyInput)) {
        privateKeyBytes = bs58.decode(keyInput);
      } else if (keyInput.includes(',')) {
        privateKeyBytes = new Uint8Array(keyInput.split(',').map(Number));
      } else {
        privateKeyBytes = new Uint8Array(Buffer.from(keyInput, 'base64'));
      }
      
      if (privateKeyBytes.length !== 64 && privateKeyBytes.length !== 32) {
        console.error('Error: Invalid private key length');
        process.exit(1);
      }
      
      keypair = Keypair.fromSecretKey(privateKeyBytes);
    } else {
      keypair = Keypair.generate();
    }
    
    const privateKeyBase58 = bs58.encode(keypair.secretKey);
    const encrypted = encryptPrivateKey(privateKeyBase58, masterKey);
    encrypted.metadata.address = keypair.publicKey.toBase58();
    encrypted.metadata.createdAt = new Date().toISOString();
    
    saveWallet(encrypted, name);
    
    const config = loadConfig();
    if (!config.defaultWallet) {
      config.defaultWallet = name;
      saveConfig(config);
    }
    
    console.log(`Wallet "${name}" created successfully!`);
    console.log(`Address: ${keypair.publicKey.toBase58()}`);
    console.log('\n⚠️  Store this address - agents will use this to identify the wallet');
    console.log('⚠️  Private key is encrypted and only accessible via admin:export-key');
  });
