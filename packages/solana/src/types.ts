import type { PublicKey, SendOptions, Transaction, VersionedTransaction, Connection, Commitment } from '@solana/web3.js';

export interface SolanaWalletProvider {
  publicKey: PublicKey;
  signTransaction?: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
  signAllTransactions?: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  sendTransaction?: (transaction: VersionedTransaction | Transaction, connection?: Connection, options?: SendOptions) => Promise<string>;
  signAndSendTransaction?: (transaction: VersionedTransaction | Transaction, connection?: Connection, options?: SendOptions) => Promise<{ signature: string }>;
}

export type { Commitment };
export type ExplorerCluster = 'mainnet-beta' | 'devnet' | 'testnet';

/**
 * Configuration options for creating a SolanaAgentWallet.
 */
export interface SolanaAgentWalletConfig {
  /** RPC URL for the Solana network. */
  rpcUrl: string;
  /** Wallet provider implementing signing/sending. */
  provider: SolanaWalletProvider;
  /** Optional commitment level for requests. Defaults to 'confirmed'. */
  commitment?: Commitment;
  /** Optional explorer cluster override used for explorer links. */
  explorerCluster?: ExplorerCluster;

  /** Optional URL of a gasless transaction relay service (e.g. Kora) to route transfers through. */
  koraConfig?: {
    /** The Kora RPC server URL. */
    rpcUrl: string;
    /** Optional API key for authentication. */
    apiKey?: string;
    /** Optional HMAC secret for signature-based authentication. */
    hmacSecret?: string;
  }
}

export interface BalanceInput {
  /** The address to query the balance of. Defaults to the wallet address. */
  address?: string;
  /** Optional SPL token mint address. If provided, returns the token balance. */
  mint?: string;
}

export interface TransferInput {
  /** Destination Base58 address. */
  to: string;
  /** Human-readable amount to transfer (e.g. `1.5`). */
  amount: number | string;
  /** Optional SPL token mint address. If provided, transfers the SPL token. */
  mint?: string;
  /** If true (default), create recipient ATA when transferring SPL tokens. */
  createAssociatedTokenAccount?: boolean;
}

export interface AirdropInput {
  /** Destination address for the airdrop. Defaults to the wallet address. */
  address?: string;
  /** Amount of SOL to request. Defaults to 1. */
  amount?: number | string;
}

export interface SolanaBalanceResult {
  address: string;
  /** The SOL or token balance. */
  balance: number;
  /** Raw balance in base units (lamports for SOL, atomic units for SPL tokens). */
  rawAmount?: string;
  /** SPL token decimals, only present for SPL balances. */
  decimals?: number;
  /** Lamports, only present for SOL balance responses. */
  lamports?: string;
  /** Populated if a minted SPL token balance was requested. */
  mint?: string;
}

export interface SolanaTransferResult {
  signature: string;
  explorerUrl: string;
  from: string;
  to: string;
  amount: string;
  rawAmount: string;
  mint?: string;
}

export interface SolanaAirdropResult {
  signature: string;
  explorerUrl: string;
  address: string;
  amount: string;
  rawAmount: string;
}
