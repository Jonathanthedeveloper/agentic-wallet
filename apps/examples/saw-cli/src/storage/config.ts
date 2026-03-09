import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

export const AGENT_WALLET_HOME = process.env.AGENT_WALLET_HOME || join(homedir(), '.agent-wallet');
export const WALLETS_DIR = join(AGENT_WALLET_HOME, 'wallets');
export const CONFIG_FILE = join(AGENT_WALLET_HOME, 'config.json');
export const MASTER_KEY_FILE = join(AGENT_WALLET_HOME, 'master.key');

export interface WalletConfig {
  version: string;
  defaultWallet: string;
  network: 'mainnet' | 'devnet' | 'testnet' | 'custom';
  rpcUrl: string;
}

export const DEFAULT_CONFIG: WalletConfig = {
  version: '1.0.0',
  defaultWallet: '',
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
};

const NETWORK_RPC_URLS: Record<string, string> = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
};

export function ensureDirectories(): void {
  if (!existsSync(AGENT_WALLET_HOME)) {
    mkdirSync(AGENT_WALLET_HOME, { mode: 0o700 });
  }
  if (!existsSync(WALLETS_DIR)) {
    mkdirSync(WALLETS_DIR, { mode: 0o700 });
  }
}

export function loadConfig(): WalletConfig {
  if (!existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG;
  }
  try {
    const data = readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: WalletConfig): void {
  ensureDirectories();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getRpcUrl(network?: string): string {
  const config = loadConfig();
  return NETWORK_RPC_URLS[network || config.network] || config.rpcUrl;
}

export function getMasterKey(): string | null {
  if (!existsSync(MASTER_KEY_FILE)) {
    return process.env.AGENT_WALLET_KEY || null;
  }
  return readFileSync(MASTER_KEY_FILE, 'utf-8').trim();
}

export function setMasterKey(key: string): void {
  ensureDirectories();
  writeFileSync(MASTER_KEY_FILE, key, { mode: 0o600 });
}
