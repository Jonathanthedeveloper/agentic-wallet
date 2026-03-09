import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { WALLETS_DIR, getMasterKey } from './config.js';

export interface WalletMetadata {
  name: string;
  address: string;
  createdAt: string;
}

export interface EncryptedWallet {
  metadata: WalletMetadata;
  encryptedPrivateKey: string;
  iv: string;
  salt: string;
  authTag: string;
}

function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return scryptSync(masterKey, salt, 32);
}

export function encryptPrivateKey(privateKey: string, masterKey?: string): EncryptedWallet {
  const key = masterKey || getMasterKey();
  if (!key) {
    throw new Error('Master encryption key not set. Set AGENT_WALLET_KEY env or run init.');
  }

  const salt = randomBytes(32);
  const iv = randomBytes(16);
  const derivedKey = deriveKey(key, salt);

  const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKey, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    metadata: {
      name: '',
      address: '',
      createdAt: new Date().toISOString(),
    },
    encryptedPrivateKey: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptPrivateKey(encrypted: EncryptedWallet, masterKey?: string): string {
  const key = masterKey || getMasterKey();
  if (!key) {
    throw new Error('Master encryption key not set.');
  }

  const salt = Buffer.from(encrypted.salt, 'base64');
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');
  const encryptedKey = Buffer.from(encrypted.encryptedPrivateKey, 'base64');

  const derivedKey = deriveKey(key, salt);

  const decipher = createDecipheriv('aes-256-gcm', derivedKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedKey),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export function saveWallet(wallet: EncryptedWallet, name: string): void {
  const filePath = join(WALLETS_DIR, `${name}.json`);
  wallet.metadata.name = name;
  writeFileSync(filePath, JSON.stringify(wallet, null, 2));
}

export function loadWallet(name: string): EncryptedWallet | null {
  const filePath = join(WALLETS_DIR, `${name}.json`);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function deleteWallet(name: string): boolean {
  const filePath = join(WALLETS_DIR, `${name}.json`);
  if (!existsSync(filePath)) {
    return false;
  }
  unlinkSync(filePath);
  return true;
}

export function listWallets(): WalletMetadata[] {
  if (!existsSync(WALLETS_DIR)) {
    return [];
  }
  const files = readdirSync(WALLETS_DIR).filter(f => f.endsWith('.json'));
  const wallets: WalletMetadata[] = [];
  
  for (const file of files) {
    const data = readFileSync(join(WALLETS_DIR, file), 'utf-8');
    try {
      const wallet: EncryptedWallet = JSON.parse(data);
      wallets.push(wallet.metadata);
    } catch {
      // skip invalid files
    }
  }
  return wallets;
}

export function getWalletAddress(name: string): string | null {
  const wallet = loadWallet(name);
  return wallet?.metadata.address || null;
}

export function createKeypairFromWallet(name: string): Keypair | null {
  const encryptedWallet = loadWallet(name);
  if (!encryptedWallet) return null;
  
  const masterKey = getMasterKey();
  if (!masterKey) return null;
  
  try {
    const privateKeyBase58 = decryptPrivateKey(encryptedWallet, masterKey);
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch {
    return null;
  }
}
