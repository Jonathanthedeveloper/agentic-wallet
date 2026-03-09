
import type { ExplorerCluster } from './types';

export function inferExplorerCluster(rpcUrl: string): ExplorerCluster {
  const normalized = rpcUrl.toLowerCase();
  if (normalized.includes('devnet')) return 'devnet';
  if (normalized.includes('testnet')) return 'testnet';
  return 'mainnet-beta';
}

export function toExplorerTxUrl(signature: string, cluster: ExplorerCluster = 'mainnet-beta'): string {
  if (cluster === 'mainnet-beta') {
    return `https://explorer.solana.com/tx/${signature}`;
  }
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}
