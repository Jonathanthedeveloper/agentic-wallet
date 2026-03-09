import type { AgentTool } from '@agentic-wallet/core';
import { AgentWallet, AgentWalletError } from '@agentic-wallet/core';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  type ParsedAccountData,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getMint,
} from '@solana/spl-token';
import { inferExplorerCluster, toExplorerTxUrl } from './utils';
import { balanceSchema, transferSchema, airdropSchema } from './schemas';
import type {
  SolanaWalletProvider,
  SolanaAgentWalletConfig,
  BalanceInput,
  TransferInput,
  AirdropInput,
  SolanaBalanceResult,
  SolanaTransferResult,
  SolanaAirdropResult,
  ExplorerCluster,
} from './types';
import { KoraClient } from '@solana/kora';

function formatBaseUnits(amount: bigint, decimals: number): string {
  if (decimals <= 0) return amount.toString();
  const raw = amount.toString().padStart(decimals + 1, '0');
  const splitAt = raw.length - decimals;
  const whole = raw.slice(0, splitAt);
  const fractional = raw.slice(splitAt).replace(/0+$/g, '');
  return fractional.length > 0 ? `${whole}.${fractional}` : whole;
}

function normalizeAmountInput(amount: number | string): string {
  const value = typeof amount === 'number'
    ? amount.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 })
    : amount.trim();

  const normalized = value.replace(/_/g, '');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new AgentWalletError('INVALID_ACTION', 'Amount must be a positive decimal number');
  }
  return normalized;
}

function parseBaseUnits(amount: number | string, decimals: number): bigint {
  const normalized = normalizeAmountInput(amount);
  const [wholePart, fractionalPart = ''] = normalized.split('.');

  if (fractionalPart.length > decimals) {
    throw new AgentWalletError(
      'INVALID_ACTION',
      `Amount has too many decimal places. Max allowed is ${decimals}.`,
    );
  }

  const base = 10n ** BigInt(decimals);
  const whole = BigInt(wholePart || '0');
  const fractional = BigInt((fractionalPart + '0'.repeat(decimals)).slice(0, decimals) || '0');
  const parsed = whole * base + fractional;

  if (parsed <= 0n) {
    throw new AgentWalletError('INVALID_ACTION', 'Amount must be greater than zero');
  }

  return parsed;
}

export class SolanaAgentWallet extends AgentWallet {
  readonly address: string;
  readonly connection: Connection;
  readonly provider: SolanaWalletProvider;
  readonly explorerCluster: ExplorerCluster;
  readonly koraClient: KoraClient | undefined;

  constructor(config: SolanaAgentWalletConfig) {
    super();
    this.provider = config.provider;
    this.address = config.provider.publicKey.toBase58();
    this.connection = new Connection(config.rpcUrl, config.commitment ?? 'confirmed');
    this.explorerCluster = config.explorerCluster ?? inferExplorerCluster(config.rpcUrl);
    this.koraClient = config.koraConfig ? new KoraClient(config.koraConfig) : undefined;
  }

  async balance(input?: BalanceInput): Promise<SolanaBalanceResult> {
    const targetAddress = input?.address ?? this.address;
    const pubKey = new PublicKey(targetAddress);

    if (input?.mint) {
      const mintPubKey = new PublicKey(input.mint);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(pubKey, {
        mint: mintPubKey,
      });

      let rawAmount = 0n;
      let decimals = 0;

      for (const account of tokenAccounts.value) {
        const parsedData = account.account.data as ParsedAccountData;
        const tokenAmount = parsedData.parsed?.info?.tokenAmount;
        const amountStr = tokenAmount?.amount;
        if (typeof amountStr === 'string') {
          rawAmount += BigInt(amountStr);
        }
        if (typeof tokenAmount?.decimals === 'number') {
          decimals = tokenAmount.decimals;
        }
      }

      const formatted = formatBaseUnits(rawAmount, decimals);
      return {
        address: targetAddress,
        mint: input.mint,
        balance: Number(formatted),
        rawAmount: rawAmount.toString(),
        decimals,
      };
    }

    const bal = await this.connection.getBalance(pubKey);
    const rawAmount = BigInt(bal);
    return {
      address: targetAddress,
      balance: bal / LAMPORTS_PER_SOL,
      rawAmount: rawAmount.toString(),
      lamports: rawAmount.toString(),
    };
  }

  async transfer(input: TransferInput): Promise<SolanaTransferResult> {
    const toPubKey = new PublicKey(input.to);
    const tx = new Transaction();
    let rawAmount = 0n;
    let amount = '';
    let mint: string | undefined;

    if (input.mint) {
      const mintPubKey = new PublicKey(input.mint);
      mint = input.mint;

      const fromAta = getAssociatedTokenAddressSync(mintPubKey, this.provider.publicKey);
      const toAta = getAssociatedTokenAddressSync(mintPubKey, toPubKey);

      const mintInfo = await getMint(this.connection, mintPubKey);
      rawAmount = parseBaseUnits(input.amount, mintInfo.decimals);
      amount = formatBaseUnits(rawAmount, mintInfo.decimals);

      const fromAtaInfo = await this.connection.getAccountInfo(fromAta);
      if (!fromAtaInfo) {
        throw new AgentWalletError('INVALID_ACTION', 'Sender does not have an associated token account for this mint', {
          details: {
            mint: input.mint,
            owner: this.address,
          },
        });
      }

      const toAtaInfo = await this.connection.getAccountInfo(toAta);
      if (!toAtaInfo) {
        if (input.createAssociatedTokenAccount === false) {
          throw new AgentWalletError(
            'INVALID_ACTION',
            'Recipient associated token account does not exist. Set createAssociatedTokenAccount to true.',
            { details: { recipient: input.to, mint: input.mint } },
          );
        }
        tx.add(
          createAssociatedTokenAccountInstruction(
            this.provider.publicKey,
            toAta,
            toPubKey,
            mintPubKey,
          ),
        );
      }

      tx.add(
        createTransferCheckedInstruction(
          fromAta,
          mintPubKey,
          toAta,
          this.provider.publicKey,
          rawAmount,
          mintInfo.decimals,
        ),
      );
    } else {
      rawAmount = parseBaseUnits(input.amount, 9);
      amount = formatBaseUnits(rawAmount, 9);
      tx.add(
        SystemProgram.transfer({
          fromPubkey: this.provider.publicKey,
          toPubkey: toPubKey,
          lamports: rawAmount,
        }),
      );
    }

    const latestBlockhash = await this.connection.getLatestBlockhash();

    tx.feePayer = this.provider.publicKey;
    tx.recentBlockhash = latestBlockhash.blockhash;

    const signature = await this.sendTransaction(tx);
    await this.connection.confirmTransaction({ signature, ...latestBlockhash });

    return {
      signature,
      explorerUrl: toExplorerTxUrl(signature, this.explorerCluster),
      from: this.address,
      to: input.to,
      mint,
      amount,
      rawAmount: rawAmount.toString(),
    };
  }

  async requestAirdrop(input?: AirdropInput): Promise<SolanaAirdropResult> {
    const targetAddress = input?.address ?? this.address;
    const amountInSol = input?.amount ?? '1';
    const lamportsAmount = parseBaseUnits(amountInSol, 9);
    const amount = formatBaseUnits(lamportsAmount, 9);

    if (lamportsAmount > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new AgentWalletError('INVALID_ACTION', 'Airdrop amount is too large');
    }

    const pubKey = new PublicKey(targetAddress);
    const signature = await this.connection.requestAirdrop(pubKey, Number(lamportsAmount));
    const latestBlockhash = await this.connection.getLatestBlockhash();
    await this.connection.confirmTransaction({ signature, ...latestBlockhash });

    return {
      signature,
      explorerUrl: toExplorerTxUrl(signature, this.explorerCluster),
      address: targetAddress,
      amount,
      rawAmount: lamportsAmount.toString(),
    };
  }

  override getTools(): AgentTool[] {
    return [
      ...super.getTools(),
      {
        name: 'solana_get_balance',
        description: 'Fetch the SOL or SPL token balance for a wallet address.',
        inputSchema: balanceSchema,
        execute: (input) => this.balance(input),
      },
      {
        name: 'solana_transfer',
        description: 'Transfer SOL or SPL token to another address.',
        inputSchema: transferSchema,
        execute: (input) => this.transfer(input),
      },
      {
        name: 'solana_request_airdrop',
        description: 'Request a SOL airdrop on devnet or testnet.',
        inputSchema: airdropSchema,
        execute: (input) => this.requestAirdrop(input),
      },
    ];
  }

  private async sendTransaction(tx: Transaction): Promise<string> {
    const latestBlockhash = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = this.provider.publicKey;

    if (this.provider.signAndSendTransaction) {
      const { signature } = await this.provider.signAndSendTransaction(tx, this.connection);
      return signature;
    }

    if (this.provider.sendTransaction) {
      return this.provider.sendTransaction(tx, this.connection);
    }

    if (this.provider.signTransaction) {
      const signedTx = await this.provider.signTransaction(tx);
      if (signedTx instanceof VersionedTransaction) {
        return this.connection.sendTransaction(signedTx);
      }
      return this.connection.sendRawTransaction(signedTx.serialize());
    }

    throw new AgentWalletError(
      'INVALID_ACTION',
      'WalletProvider does not support signing or sending transactions.',
    );
  }
}
