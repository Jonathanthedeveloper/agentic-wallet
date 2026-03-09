import { SolanaAgentWallet } from '@agentic-wallet/solana';
import { createKeypairProvider } from '@agentic-wallet/solana';
import { createKeypairFromWallet, loadWallet } from '../storage/wallet.js';
import { loadConfig, getRpcUrl } from '../storage/config.js';
import type { AgentTool } from '@agentic-wallet/core';
import { raydiumPlugin, jupiterPlugin } from "@agentic-wallet/solana/plugin"

export function getCurrentWalletName(): string {
  const config = loadConfig();
  return config.defaultWallet;
}

export function createWalletFromName(walletName: string): SolanaAgentWallet | null {
  const keypair = createKeypairFromWallet(walletName);
  if (!keypair) return null;

  const config = loadConfig();
  const rpcUrl = getRpcUrl(config.network);

  const provider = createKeypairProvider(keypair.secretKey);

  return new SolanaAgentWallet({
    rpcUrl,
    provider,
  }).use(raydiumPlugin()).use(jupiterPlugin({
    apiKey: process.env.JUPITER_API_KEY || undefined,
  }));
}

export function createCurrentWallet(): SolanaAgentWallet | null {
  const walletName = getCurrentWalletName();
  if (!walletName) return null;
  return createWalletFromName(walletName);
}

export function getWalletTools(): AgentTool[] {
  const wallet = createCurrentWallet();
  if (!wallet) return [];
  return wallet.getTools();
}

export function getWalletAddressForName(walletName: string): string | null {
  const encrypted = loadWallet(walletName);
  return encrypted?.metadata.address || null;
}
