import type { WalletPlugin, AgentTool } from '@agentic-wallet/core';
import { AgentWalletError } from '@agentic-wallet/core';
import {
  Raydium,
  Token,
  TokenAmount,
  Router,
  TxVersion,
  toBN,
  toPercent,
  PoolFetchType,
  CREATE_CPMM_POOL_PROGRAM,
  CREATE_CPMM_POOL_FEE_ACC,
  DEVNET_PROGRAM_ID,
  FARM_PROGRAM_ID_V6,
  type ApiV3PoolInfoItem,
  type ApiV3PoolInfoStandardItem,
  type ApiV3PoolInfoStandardItemCpmm,
  type ApiV3Token,
  type FormatFarmInfoOut,
  type FarmRewardInfo,
} from '@raydium-io/raydium-sdk-v2';
import {
  createBurnCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  PublicKey,
  Transaction,
  VersionedTransaction,
  type Signer,
} from '@solana/web3.js';
import { z } from 'zod';
import { toExplorerTxUrl } from '../../utils';
import type { SolanaAgentWallet } from '../../wallet';
import type {
  RaydiumMethods,
  RaydiumPluginConfig,
  RaydiumCluster,
  RaydiumPoolByIdsInput,
  RaydiumPoolByMintsInput,
  RaydiumPoolLiquidityLineInput,
  RaydiumPoolQueryInput,
  RaydiumTokenInfoInput,
  RaydiumWalletPortfolioInput,
  RaydiumWalletTokenBalance,
  RaydiumSwapExactInInput,
  RaydiumCreatePoolInput,
  RaydiumCreateFarmInput,
  RaydiumBurnTokenInput,
  RaydiumAddLiquidityInput,
  RaydiumRemoveLiquidityInput,
  RaydiumStakeLiquidityInput,
  RaydiumUnstakeLiquidityInput,
  RaydiumHarvestFarmRewardsInput,
  RaydiumSwapResult,
  RaydiumPortfolioSummary,
} from './types';
import {
  swapExactInSchema,
  addLiquiditySchema,
  amountSchema,
  burnTokenSchema,
  byIdsSchema,
  byMintsSchema,
  createFarmSchema,
  createPoolSchema,
  harvestFarmRewardsSchema,
  poolLineSchema,
  poolQuerySchema,
  rawAmountSchema,
  removeLiquiditySchema,
  stakeLiquiditySchema,
  tokenInfoSchema,
  unstakeLiquiditySchema,
  walletPortfolioSchema
} from "./schema"

type BNLike = ReturnType<typeof toBN>;
type FetchPoolByMintsParams = Parameters<Raydium['api']['fetchPoolByMints']>[0];
type GetPoolListParams = NonNullable<Parameters<Raydium['api']['getPoolList']>[0]>;

function inferRaydiumCluster(rpcEndpoint: string): RaydiumCluster {
  return rpcEndpoint.toLowerCase().includes('devnet') ? 'devnet' : 'mainnet';
}

function compactObject<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as T;
}

function requireIds(ids: string[]): string[] {
  const normalized = ids.map((id) => id.trim()).filter(Boolean);
  if (normalized.length === 0) {
    throw new AgentWalletError('INVALID_ACTION', 'At least one id must be provided');
  }
  return normalized;
}

function chunk<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
}

function unwrapApiData(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  if ('data' in record) return unwrapApiData(record.data);
  return value;
}

function normalizeAmountInput(amount: number | string): string {
  const value =
    typeof amount === 'number'
      ? amount.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 })
      : amount.trim();

  const normalized = value.replace(/_/g, '');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new AgentWalletError('INVALID_ACTION', 'Amount must be a positive decimal number');
  }

  return normalized;
}

function parseUiAmountToRaw(amount: number | string, decimals: number): BNLike {
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

  return toBN(parsed.toString());
}

function formatRawAmount(raw: BNLike, decimals: number): string {
  if (decimals <= 0) return raw.toString();
  const value = raw.toString().padStart(decimals + 1, '0');
  const splitAt = value.length - decimals;
  const whole = value.slice(0, splitAt);
  const fractional = value.slice(splitAt).replace(/0+$/g, '');
  return fractional ? `${whole}.${fractional}` : whole;
}

function parseRawAmount(options: {
  amount?: number | string;
  amountRaw?: string;
  decimals: number;
}): BNLike {
  if (options.amountRaw) {
    const normalized = options.amountRaw.trim();
    if (!/^\d+$/.test(normalized)) {
      throw new AgentWalletError('INVALID_ACTION', 'amountRaw must be a positive integer string');
    }
    const parsed = toBN(normalized);
    if (parsed.lte(toBN(0))) {
      throw new AgentWalletError('INVALID_ACTION', 'Amount must be greater than zero');
    }
    return parsed;
  }

  if (options.amount === undefined) {
    throw new AgentWalletError('INVALID_ACTION', 'Either amount or amountRaw is required');
  }

  return parseUiAmountToRaw(options.amount, options.decimals);
}

function isCpmmPool(pool: ApiV3PoolInfoItem): pool is ApiV3PoolInfoStandardItemCpmm {
  return pool.type === 'Standard' && !('marketId' in pool) && 'config' in pool;
}

function isAmmPool(pool: ApiV3PoolInfoItem): pool is ApiV3PoolInfoStandardItem {
  return pool.type === 'Standard' && 'marketId' in pool;
}

function toFarmDWInfo(farmInfo: FormatFarmInfoOut): {
  id: string;
  programId: string;
  lpMint: ApiV3Token;
  rewardInfos: { mint: ApiV3Token }[];
} {
  return {
    id: farmInfo.id,
    programId: farmInfo.programId,
    lpMint: farmInfo.lpMint,
    rewardInfos: farmInfo.rewardInfos.map((reward) => ({ mint: reward.mint })),
  };
}

function toRaydiumPoolFetchType(type?: RaydiumPoolQueryInput['type']): PoolFetchType | undefined {
  if (!type) return undefined;

  switch (type) {
    case 'all':
      return PoolFetchType.All;
    case 'concentrated':
      return PoolFetchType.Concentrated;
    case 'standard':
      return PoolFetchType.Standard;
    case 'allFarm':
      return PoolFetchType.AllFarm;
    case 'standardFarm':
      return PoolFetchType.StandardFarm;
    case 'concentratedFarm':
      return PoolFetchType.ConcentratedFarm;
    default:
      return undefined;
  }
}
export function raydiumPlugin(config?: RaydiumPluginConfig): WalletPlugin<SolanaAgentWallet, RaydiumMethods> {
  return {
    name: 'raydium',
    register(wallet) {
      let raydiumPromise: Promise<Raydium> | undefined;
      const pluginCluster = config?.cluster ?? inferRaydiumCluster(wallet.connection.rpcEndpoint);

      const getRaydium = async (): Promise<Raydium> => {
        if (!raydiumPromise) {
          raydiumPromise = Raydium.load({
            connection: wallet.connection,
            owner: wallet.provider.publicKey,
            signAllTransactions: wallet.provider.signAllTransactions,
            cluster: pluginCluster,
            disableLoadToken: config?.disableLoadToken ?? true,
            disableFeatureCheck: true,
            apiRequestInterval: config?.apiRequestInterval ?? 5 * 60 * 1000,
            apiRequestTimeout: config?.apiRequestTimeout ?? 10 * 1000,
          }).catch((error) => {
            raydiumPromise = undefined;
            throw new AgentWalletError('INITIALIZATION_FAILURE', 'Failed to initialize Raydium SDK', {
              cause: error,
            });
          });
        }
        return raydiumPromise;
      };

      const signAndSendTransaction = async (
        tx: Transaction | VersionedTransaction,
        signers: Signer[] = [],
      ): Promise<string> => {
        if (tx instanceof Transaction && !tx.recentBlockhash) {
          const { blockhash } = await wallet.connection.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          if (!tx.feePayer) tx.feePayer = wallet.provider.publicKey;
        }

        if (signers.length > 0) {
          if (tx instanceof VersionedTransaction) {
            tx.sign(signers);
          } else {
            tx.partialSign(...signers);
          }
        }

        if (wallet.provider.signAndSendTransaction) {
          const { signature } = await wallet.provider.signAndSendTransaction(tx, wallet.connection);
          return signature;
        }

        if (wallet.provider.sendTransaction) {
          if (wallet.provider.signTransaction) {
            const signed =
              tx instanceof VersionedTransaction
                ? await wallet.provider.signTransaction(tx)
                : await wallet.provider.signTransaction(tx);
            return wallet.provider.sendTransaction(signed, wallet.connection);
          }
          return wallet.provider.sendTransaction(tx, wallet.connection);
        }

        if (wallet.provider.signTransaction) {
          if (tx instanceof VersionedTransaction) {
            const signed = await wallet.provider.signTransaction(tx);
            return wallet.connection.sendTransaction(signed);
          }
          const signed = await wallet.provider.signTransaction(tx);
          return wallet.connection.sendRawTransaction(signed.serialize());
        }

        throw new AgentWalletError(
          'INVALID_ACTION',
          'WalletProvider does not support sending Raydium transactions',
        );
      };

      const confirmSignature = async (signature: string): Promise<void> => {
        const latestBlockhash = await wallet.connection.getLatestBlockhash('confirmed');
        await wallet.connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
      };

      const sendBuiltTx = async (builtTx: {
        transaction: Transaction | VersionedTransaction;
        signers: Signer[];
      }): Promise<{ signatures: string[]; explorerUrls: string[] }> => {
        const signature = await signAndSendTransaction(builtTx.transaction, builtTx.signers ?? []);
        await confirmSignature(signature);

        return {
          signatures: [signature],
          explorerUrls: [toExplorerTxUrl(signature, wallet.explorerCluster)],
        };
      };

      const sendBuiltMultiTx = async (builtTx: {
        transactions: (Transaction | VersionedTransaction)[];
        signers: Signer[][];
      }): Promise<{ signatures: string[]; explorerUrls: string[] }> => {
        const signatures: string[] = [];

        for (let index = 0; index < builtTx.transactions.length; index += 1) {
          const transaction = builtTx.transactions[index]!;
          const signers = builtTx.signers[index] ?? [];
          const signature = await signAndSendTransaction(transaction, signers);
          await confirmSignature(signature);
          signatures.push(signature);
        }

        return {
          signatures,
          explorerUrls: signatures.map((signature) => toExplorerTxUrl(signature, wallet.explorerCluster)),
        };
      };

      const getPoolById = async (poolId: string): Promise<ApiV3PoolInfoItem> => {
        const raydium = await getRaydium();
        const pools = await raydium.api.fetchPoolById({ ids: poolId });
        const pool = pools[0];
        if (!pool) {
          throw new AgentWalletError('INVALID_ACTION', `Pool not found: ${poolId}`);
        }
        return pool;
      };

      const getFarmById = async (farmId: string): Promise<FormatFarmInfoOut> => {
        const raydium = await getRaydium();
        const farms = await raydium.api.fetchFarmInfoById({ ids: farmId });
        const farm = farms[0];
        if (!farm) {
          throw new AgentWalletError('INVALID_ACTION', `Farm not found: ${farmId}`);
        }
        return farm;
      };

      const resolveMintInfo = async (mintAddress: string): Promise<{ address: string; decimals: number; programId: string }> => {
        const raydium = await getRaydium();
        const tokenInfos = await raydium.api.getTokenInfo([mintAddress]);
        const tokenInfo = tokenInfos.find((token) => token.address === mintAddress);

        if (tokenInfo) {
          return {
            address: tokenInfo.address,
            decimals: tokenInfo.decimals,
            programId: tokenInfo.programId,
          };
        }

        const mintPubkey = new PublicKey(mintAddress);

        try {
          const mint = await getMint(wallet.connection, mintPubkey, 'confirmed', TOKEN_PROGRAM_ID);
          return {
            address: mintAddress,
            decimals: mint.decimals,
            programId: TOKEN_PROGRAM_ID.toBase58(),
          };
        } catch {
          const mint = await getMint(wallet.connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID);
          return {
            address: mintAddress,
            decimals: mint.decimals,
            programId: TOKEN_2022_PROGRAM_ID.toBase58(),
          };
        }
      };

      const getWalletTokenBalances = async (input?: RaydiumWalletPortfolioInput): Promise<RaydiumWalletTokenBalance[]> => {
        const owner = new PublicKey(input?.address ?? wallet.address);
        const [splAccounts, token2022Accounts] = await Promise.all([
          wallet.connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
          wallet.connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }),
        ]);

        const parsed = [
          ...splAccounts.value.map((account) => ({ account, programId: TOKEN_PROGRAM_ID.toBase58() })),
          ...token2022Accounts.value.map((account) => ({ account, programId: TOKEN_2022_PROGRAM_ID.toBase58() })),
        ];

        return parsed
          .map(({ account, programId }) => {
            const parsedData = account.account.data as { parsed?: { info?: { tokenAmount?: { amount?: string; decimals?: number; uiAmount?: number; uiAmountString?: string }; mint?: string } } };
            const tokenAmount = parsedData.parsed?.info?.tokenAmount;
            const mint = parsedData.parsed?.info?.mint;
            if (typeof mint !== 'string' || typeof tokenAmount?.amount !== 'string') return null;

            const decimals = typeof tokenAmount.decimals === 'number' ? tokenAmount.decimals : 0;
            const uiAmount =
              typeof tokenAmount.uiAmount === 'number'
                ? tokenAmount.uiAmount
                : Number(tokenAmount.uiAmountString ?? 0);

            return {
              mint,
              amount: tokenAmount.amount,
              decimals,
              uiAmount,
              tokenProgram: programId,
            } satisfies RaydiumWalletTokenBalance;
          })
          .filter((item): item is RaydiumWalletTokenBalance => item !== null);
      };

      const methods: RaydiumMethods = {
        // Actions
        async raydiumSwapExactIn(input: RaydiumSwapExactInInput): Promise<RaydiumSwapResult> {
          const raydium = await getRaydium();
          const inputMint = new PublicKey(input.inputMint);
          const outputMint = new PublicKey(input.outputMint);
          const slippage = (input.slippageBps ?? 50) / 10_000;

          // const { ammPools, clmmPools, cpmmPools } = await raydium.tradeV2.fetchRoutePoolBasicInfo();
          const poolData = await raydium.tradeV2.fetchRoutePoolBasicInfo()



          const routes = raydium.tradeV2.getAllRoute({
            inputMint,
            outputMint,
            ...poolData,
          });

          if (routes.directPath.length === 0 && Object.keys(routes.routePathDict).length === 0) {
            throw new AgentWalletError('INVALID_ACTION', 'No Raydium swap route found for the given token pair');
          }

          const routeData = await raydium.tradeV2.fetchSwapRoutesData({
            routes,
            inputMint: inputMint.toBase58(),
            outputMint: outputMint.toBase58(),
          });

          const inputMintInfo = routeData.mintInfos[inputMint.toBase58()];
          if (!inputMintInfo) {
            throw new AgentWalletError('INVALID_ACTION', `Input mint is not swappable on Raydium: ${input.inputMint}`);
          }

          const amountInRaw = parseRawAmount({
            amount: input.amount,
            amountRaw: input.amountRaw,
            decimals: inputMintInfo.decimals,
          });

          const inputToken = new Token({
            mint: inputMintInfo.address,
            decimals: inputMintInfo.decimals,
            isToken2022: inputMintInfo.programId.equals(TOKEN_2022_PROGRAM_ID),
          });
          const inputTokenAmount = new TokenAmount(inputToken, amountInRaw, true);

          const outputTokenInfo = (await raydium.api.getTokenInfo([outputMint.toBase58()]))[0] ?? {
            chainId: 101,
            address: outputMint.toBase58(),
            programId: routeData.mintInfos[outputMint.toBase58()]?.programId.toBase58() ?? TOKEN_PROGRAM_ID.toBase58(),
            logoURI: '',
            symbol: outputMint.toBase58().slice(0, 6),
            name: outputMint.toBase58().slice(0, 6),
            decimals: routeData.mintInfos[outputMint.toBase58()]?.decimals ?? 0,
            tags: [],
            extensions: {},
          };

          const directPath = routes.directPath
            .map((pool) => {
              const id = pool.id.toBase58();
              return (
                routeData.ammSimulateCache[id] ??
                routeData.computeClmmPoolInfo[id] ??
                routeData.computeCpmmData[id]
              );
            })
            .filter((pool): pool is NonNullable<typeof pool> => Boolean(pool));

          const [chainTime, epochInfo] = await Promise.all([
            raydium.currentBlockChainTime(),
            raydium.fetchEpochInfo(),
          ]);

          const quotes = raydium.tradeV2.getAllRouteComputeAmountOut({
            directPath,
            routePathDict: routeData.routePathDict,
            simulateCache: routeData.ammSimulateCache,
            tickCache: routeData.computePoolTickData,
            mintInfos: routeData.mintInfos,
            inputTokenAmount,
            outputToken: outputTokenInfo,
            slippage,
            chainTime,
            epochInfo,
          });

          const sortedQuotes = [...quotes].sort((left, right) => {
            const leftNet = left.amountOut.amount.raw.sub(left.amountOut.fee?.raw ?? toBN(0));
            const rightNet = right.amountOut.amount.raw.sub(right.amountOut.fee?.raw ?? toBN(0));
            return rightNet.cmp(leftNet);
          });

          const bestQuote = sortedQuotes[0];
          if (!bestQuote) {
            throw new AgentWalletError('INVALID_ACTION', 'Failed to compute a valid Raydium swap quote');
          }

          const swapPoolKeys = await raydium.tradeV2.computePoolToPoolKeys({
            pools: bestQuote.poolInfoList,
            clmmRpcData: routeData.clmmPoolsRpcInfo,
            ammRpcData: routeData.ammPoolsRpcInfo,
          });

          const txData = await raydium.tradeV2.swap({
            txVersion: TxVersion.LEGACY,
            swapInfo: bestQuote,
            swapPoolKeys,
            ownerInfo: {
              associatedOnly: true,
              checkCreateATAOwner: true,
            },
            routeProgram: Router,
          });

          const sent = await sendBuiltMultiTx(txData);

          return {
            signatures: sent.signatures,
            explorerUrls: sent.explorerUrls,
            inputMint: inputMint.toBase58(),
            outputMint: outputMint.toBase58(),
            amountInRaw: amountInRaw.toString(),
            amountOutRaw: bestQuote.amountOut.amount.raw.toString(),
            minAmountOutRaw: bestQuote.minAmountOut.amount.raw.toString(),
            routeType: bestQuote.routeType,
          };
        },

        async raydiumCreatePool(input: RaydiumCreatePoolInput): Promise<{ signatures: string[]; explorerUrls: string[]; pool: unknown }> {
          const raydium = await getRaydium();
          const [mintAInfo, mintBInfo] = await Promise.all([
            resolveMintInfo(input.mintA),
            resolveMintInfo(input.mintB),
          ]);

          const mintAAmount = parseRawAmount({
            amount: input.amountA,
            amountRaw: input.amountARaw,
            decimals: mintAInfo.decimals,
          });
          const mintBAmount = parseRawAmount({
            amount: input.amountB,
            amountRaw: input.amountBRaw,
            decimals: mintBInfo.decimals,
          });

          const cpmmConfigs = await raydium.api.getCpmmConfigs();
          const feeConfig =
            cpmmConfigs.find((configItem) => configItem.id === input.feeConfigId) ?? cpmmConfigs[0];

          if (!feeConfig) {
            throw new AgentWalletError('INITIALIZATION_FAILURE', 'No Raydium CPMM config available');
          }

          const cpmmProgramId =
            pluginCluster === 'devnet'
              ? DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM
              : CREATE_CPMM_POOL_PROGRAM;

          const cpmmPoolFeeAccount =
            pluginCluster === 'devnet'
              ? DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC
              : CREATE_CPMM_POOL_FEE_ACC;

          const txData = await raydium.cpmm.createPool({
            programId: cpmmProgramId,
            poolFeeAccount: cpmmPoolFeeAccount,
            mintA: mintAInfo,
            mintB: mintBInfo,
            mintAAmount,
            mintBAmount,
            startTime: toBN(String(input.startTime ?? Math.floor(Date.now() / 1000))),
            feeConfig,
            associatedOnly: true,
            checkCreateATAOwner: true,
            ownerInfo: {
              useSOLBalance: true,
            },
            txVersion: TxVersion.LEGACY,
          });

          const sent = await sendBuiltTx(txData);

          return {
            signatures: sent.signatures,
            explorerUrls: sent.explorerUrls,
            pool: txData.extInfo?.address ?? null,
          };
        },

        async raydiumCreateFarm(input: RaydiumCreateFarmInput): Promise<{ signatures: string[]; explorerUrls: string[]; farm: unknown }> {
          const raydium = await getRaydium();
          const pool = await getPoolById(input.poolId);

          if (!isAmmPool(pool)) {
            throw new AgentWalletError('INVALID_ACTION', 'Raydium farm creation currently supports standard AMM pools only');
          }

          const rewardInfos: FarmRewardInfo[] = input.rewards.map((reward) => ({
            mint: new PublicKey(reward.mint),
            perSecond: reward.perSecond,
            openTime: reward.openTime,
            endTime: reward.endTime,
            rewardType: reward.rewardType ?? 'Standard SPL',
          }));

          const programId =
            input.programId
              ? new PublicKey(input.programId)
              : pluginCluster === 'devnet'
                ? DEVNET_PROGRAM_ID.FARM_PROGRAM_ID_V6
                : FARM_PROGRAM_ID_V6;

          const txData = await raydium.farm.create({
            poolInfo: pool,
            rewardInfos,
            programId,
            txVersion: TxVersion.LEGACY,
          });

          const sent = await sendBuiltTx(txData);

          return {
            signatures: sent.signatures,
            explorerUrls: sent.explorerUrls,
            farm: txData.extInfo ?? null,
          };
        },

        async raydiumBurnToken(input: RaydiumBurnTokenInput): Promise<{ signature: string; explorerUrl: string; mint: string; rawAmount: string }> {
          const ownerAddress = input.owner ?? wallet.address;
          if (ownerAddress !== wallet.address) {
            throw new AgentWalletError('INVALID_ACTION', 'Burn currently supports only the connected wallet owner');
          }

          const mintPubkey = new PublicKey(input.mint);
          const mintInfo = await getMint(wallet.connection, mintPubkey);
          const rawAmount = parseRawAmount({
            amount: input.amount,
            amountRaw: input.amountRaw,
            decimals: mintInfo.decimals,
          });

          const ownerPubkey = new PublicKey(ownerAddress);
          const tokenAccount = getAssociatedTokenAddressSync(mintPubkey, ownerPubkey);

          const tx = new Transaction().add(
            createBurnCheckedInstruction(
              tokenAccount,
              mintPubkey,
              ownerPubkey,
              BigInt(rawAmount.toString()),
              mintInfo.decimals,
            ),
          );

          const signature = await signAndSendTransaction(tx);
          await confirmSignature(signature);

          return {
            signature,
            explorerUrl: toExplorerTxUrl(signature, wallet.explorerCluster),
            mint: input.mint,
            rawAmount: rawAmount.toString(),
          };
        },

        async raydiumAddLiquidity(input: RaydiumAddLiquidityInput): Promise<{ signatures: string[]; explorerUrls: string[]; poolId: string }> {
          const raydium = await getRaydium();
          const pool = await getPoolById(input.poolId);
          const slippageBps = input.slippageBps ?? 50;
          const slippage = toPercent(slippageBps / 100, { alreadyDecimaled: true });

          if (isCpmmPool(pool)) {
            const baseIn = input.baseIn ?? true;
            const decimals = baseIn ? pool.mintA.decimals : pool.mintB.decimals;
            const inputAmount = parseRawAmount({
              amount: input.amount,
              amountRaw: input.amountRaw,
              decimals,
            });

            const txData = await raydium.cpmm.addLiquidity({
              poolInfo: pool,
              inputAmount,
              baseIn,
              slippage,
              config: {
                checkCreateATAOwner: true,
              },
              txVersion: TxVersion.LEGACY,
            });

            const sent = await sendBuiltTx(txData);
            return { ...sent, poolId: pool.id };
          }

          if (isAmmPool(pool)) {
            const baseIn = input.baseIn ?? true;
            const fixedDecimals = baseIn ? pool.mintA.decimals : pool.mintB.decimals;
            const fixedRawAmount = parseRawAmount({
              amount: input.amount,
              amountRaw: input.amountRaw,
              decimals: fixedDecimals,
            });

            const fixedUiAmount = formatRawAmount(fixedRawAmount, fixedDecimals);
            const pair = raydium.liquidity.computePairAmount({
              poolInfo: pool,
              amount: fixedUiAmount,
              slippage,
              baseIn,
            });

            const tokenA = new Token({
              mint: pool.mintA.address,
              decimals: pool.mintA.decimals,
              isToken2022: pool.mintA.programId === TOKEN_2022_PROGRAM_ID.toBase58(),
            });
            const tokenB = new Token({
              mint: pool.mintB.address,
              decimals: pool.mintB.decimals,
              isToken2022: pool.mintB.programId === TOKEN_2022_PROGRAM_ID.toBase58(),
            });

            const fixedAmount = new TokenAmount(baseIn ? tokenA : tokenB, fixedRawAmount, true);
            const txData = await raydium.liquidity.addLiquidity({
              poolInfo: pool,
              amountInA: baseIn ? fixedAmount : pair.maxAnotherAmount,
              amountInB: baseIn ? pair.maxAnotherAmount : fixedAmount,
              otherAmountMin: pair.minAnotherAmount,
              fixedSide: baseIn ? 'a' : 'b',
              config: {
                checkCreateATAOwner: true,
              },
              txVersion: TxVersion.LEGACY,
            });

            const sent = await sendBuiltTx(txData);
            return { ...sent, poolId: pool.id };
          }

          throw new AgentWalletError('INVALID_ACTION', 'Unsupported pool type for add liquidity');
        },

        async raydiumRemoveLiquidity(input: RaydiumRemoveLiquidityInput): Promise<{ signatures: string[]; explorerUrls: string[]; poolId: string }> {
          const raydium = await getRaydium();
          const pool = await getPoolById(input.poolId);

          if (isCpmmPool(pool)) {
            const lpAmount = parseRawAmount({
              amount: input.lpAmount,
              amountRaw: input.lpAmountRaw,
              decimals: pool.lpMint.decimals,
            });
            const slippageBps = input.slippageBps ?? 50;
            const slippage = toPercent(slippageBps / 100, { alreadyDecimaled: true });

            const txData = await raydium.cpmm.withdrawLiquidity({
              poolInfo: pool,
              lpAmount,
              slippage,
              txVersion: TxVersion.LEGACY,
            });

            const sent = await sendBuiltTx(txData);
            return { ...sent, poolId: pool.id };
          }

          if (isAmmPool(pool)) {
            const lpAmount = parseRawAmount({
              amount: input.lpAmount,
              amountRaw: input.lpAmountRaw,
              decimals: pool.lpMint.decimals,
            });

            const txData = await raydium.liquidity.removeLiquidity({
              poolInfo: pool,
              lpAmount,
              baseAmountMin: toBN(0),
              quoteAmountMin: toBN(0),
              config: {
                checkCreateATAOwner: true,
              },
              txVersion: TxVersion.LEGACY,
            });

            const sent = await sendBuiltTx(txData);
            return { ...sent, poolId: pool.id };
          }

          throw new AgentWalletError('INVALID_ACTION', 'Unsupported pool type for remove liquidity');
        },

        async raydiumStakeLiquidity(input: RaydiumStakeLiquidityInput): Promise<{ signatures: string[]; explorerUrls: string[]; farmId: string }> {
          const raydium = await getRaydium();
          const farmInfo = await getFarmById(input.farmId);

          const amount = parseRawAmount({
            amount: input.amount,
            amountRaw: input.amountRaw,
            decimals: farmInfo.lpMint.decimals,
          });

          const txData = await raydium.farm.deposit({
            farmInfo: toFarmDWInfo(farmInfo),
            amount,
            associatedOnly: true,
            checkCreateATAOwner: true,
            txVersion: TxVersion.LEGACY,
          });

          const sent = await sendBuiltTx(txData);
          return { ...sent, farmId: input.farmId };
        },

        async raydiumUnstakeLiquidity(input: RaydiumUnstakeLiquidityInput): Promise<{ signatures: string[]; explorerUrls: string[]; farmId: string }> {
          const raydium = await getRaydium();
          const farmInfo = await getFarmById(input.farmId);

          const amount = parseRawAmount({
            amount: input.amount,
            amountRaw: input.amountRaw,
            decimals: farmInfo.lpMint.decimals,
          });

          const txData = await raydium.farm.withdraw({
            farmInfo: toFarmDWInfo(farmInfo),
            amount,
            associatedOnly: true,
            checkCreateATAOwner: true,
            txVersion: TxVersion.LEGACY,
          });

          const sent = await sendBuiltTx(txData);
          return { ...sent, farmId: input.farmId };
        },

        async raydiumHarvestFarmRewards(input: RaydiumHarvestFarmRewardsInput): Promise<{ signatures: string[]; explorerUrls: string[] }> {
          const raydium = await getRaydium();
          const farmIds = requireIds(input.farmIds);
          const farms = await raydium.api.fetchFarmInfoById({ ids: farmIds.join(',') });
          const validFarms = farms.filter((farm): farm is NonNullable<typeof farm> => farm !== null);

          if (validFarms.length === 0) {
            throw new AgentWalletError('INVALID_ACTION', 'No farms found for reward harvesting');
          }

          const farmInfoList = Object.fromEntries(validFarms.map((farm) => [farm.id, farm]));

          const txData = await raydium.farm.harvestAllRewards({
            farmInfoList,
            associatedOnly: true,
            checkCreateATAOwner: true,
            txVersion: TxVersion.LEGACY,
          });

          return sendBuiltMultiTx(txData);
        },

        // Swap
        async raydiumGetSwapPoolsByMints(input: RaydiumPoolByMintsInput): Promise<unknown> {
          const raydium = await getRaydium();
          const params = compactObject<FetchPoolByMintsParams>({
            mint1: input.mint1,
            mint2: input.mint2,
            type: toRaydiumPoolFetchType(input.type),
            sort: input.sort,
            order: input.order,
            page: input.page,
          });
          return raydium.api.fetchPoolByMints(params);
        },

        async raydiumGetSwapPoolsByIds(input: RaydiumPoolByIdsInput): Promise<unknown[]> {
          const raydium = await getRaydium();
          const ids = requireIds(input.ids).join(',');
          return raydium.api.fetchPoolById({ ids });
        },

        // Liquidity
        async raydiumGetLiquidityPools(input: RaydiumPoolQueryInput = {}): Promise<unknown> {
          const raydium = await getRaydium();
          const params = compactObject<GetPoolListParams>({
            type: toRaydiumPoolFetchType(input.type),
            sort: input.sort,
            order: input.order,
            page: input.page,
            pageSize: input.pageSize,
          });
          return raydium.api.getPoolList(params);
        },

        async raydiumGetLiquidityPoolKeysByIds(input: RaydiumPoolByIdsInput): Promise<unknown[]> {
          const raydium = await getRaydium();
          const idList = requireIds(input.ids);
          return raydium.api.fetchPoolKeysById({ idList });
        },

        async raydiumGetClmmPoolLiquidityLine(input: RaydiumPoolLiquidityLineInput): Promise<{ price: string; liquidity: string }[]> {
          const raydium = await getRaydium();
          return raydium.api.getClmmPoolLines(input.poolId);
        },

        // Portfolio
        async raydiumGetTokenList(): Promise<{ mintList: unknown[]; blacklist: string[]; whiteList: string[] }> {
          const raydium = await getRaydium();
          const tokenList = await raydium.api.getTokenList();
          return {
            mintList: tokenList.mintList,
            blacklist: tokenList.blacklist,
            whiteList: tokenList.whiteList,
          };
        },

        async raydiumGetTokenInfo(input: RaydiumTokenInfoInput): Promise<unknown[]> {
          const raydium = await getRaydium();
          return raydium.api.getTokenInfo(input.mints);
        },

        async raydiumGetWalletTokenBalances(input?: RaydiumWalletPortfolioInput): Promise<RaydiumWalletTokenBalance[]> {
          return getWalletTokenBalances(input);
        },

        async raydiumGetPortfolioSummary(input?: RaydiumWalletPortfolioInput): Promise<RaydiumPortfolioSummary> {
          const raydium = await getRaydium();
          const ownerAddress = input?.address ?? wallet.address;
          const tokenBalances = await getWalletTokenBalances({ address: ownerAddress });

          const assetsByToken = Object.fromEntries(
            tokenBalances.map((token) => [token.mint, token.amount]),
          );

          const lpMints = tokenBalances
            .filter((token) => {
              try {
                return BigInt(token.amount) > 0n;
              } catch {
                return false;
              }
            })
            .map((token) => token.mint);

          const poolsByLpMint = new Map<string, unknown>();

          for (const mintChunk of chunk(lpMints, 20)) {
            try {
              const response = await raydium.api.api.get('/pools/info/lps', {
                params: { lps: mintChunk.join(',') },
              });

              const unwrapped = unwrapApiData(response);
              const pools =
                Array.isArray(unwrapped)
                  ? unwrapped
                  : Array.isArray((unwrapped as { data?: unknown[] })?.data)
                    ? (unwrapped as { data: unknown[] }).data
                    : [];

              for (const pool of pools) {
                const lpMintAddress =
                  (pool as { lpMint?: { address?: string } })?.lpMint?.address ??
                  (pool as { lpMint?: string })?.lpMint;
                if (typeof lpMintAddress === 'string') {
                  poolsByLpMint.set(lpMintAddress, pool);
                }
              }
            } catch {
              // endpoint unavailable (e.g. devnet) — skip
            }
          }

          const liquidities = tokenBalances
            .filter((token) => poolsByLpMint.has(token.mint))
            .map((token) => ({
              lpMint: token.mint,
              lpAmountRaw: token.amount,
              lpUiAmount: token.uiAmount,
              pool: poolsByLpMint.get(token.mint),
            }));

          let stakes: unknown[] = [];
          try {
            const stakeResponse = await raydium.api.api.get(`/position/stake/${ownerAddress}`);
            const unwrappedStake = unwrapApiData(stakeResponse);
            stakes =
              Array.isArray(unwrappedStake)
                ? unwrappedStake
                : Array.isArray((unwrappedStake as { data?: unknown[] })?.data)
                  ? (unwrappedStake as { data: unknown[] }).data
                  : [];
          } catch {
            // endpoint unavailable (e.g. devnet) — skip
          }

          const yields = stakes.flatMap((stake) => {
            const rewards =
              (stake as { rewardInfos?: unknown[] })?.rewardInfos ??
              (stake as { rewards?: unknown[] })?.rewards ??
              [];

            if (!Array.isArray(rewards)) return [];

            return rewards.map((reward) => ({
              farmId:
                (stake as { id?: string })?.id ??
                (stake as { farmId?: string })?.farmId ??
                'unknown',
              reward,
            }));
          });

          const assetByPools: Record<string, unknown> = {};
          for (const liquidity of liquidities) {
            const poolId =
              (liquidity.pool as { id?: string })?.id ??
              (liquidity.pool as { poolId?: string })?.poolId;
            if (!poolId) continue;

            assetByPools[poolId] = {
              pool: liquidity.pool,
              lpMint: liquidity.lpMint,
              lpAmountRaw: liquidity.lpAmountRaw,
              lpUiAmount: liquidity.lpUiAmount,
            };
          }

          return {
            tokens: tokenBalances,
            assetsByToken,
            liquidities,
            stakes,
            yields,
            assetByPools,
          };
        },

        // Staking
        async raydiumGetStakingFarmsByIds(input: RaydiumPoolByIdsInput): Promise<unknown[]> {
          const raydium = await getRaydium();
          const ids = requireIds(input.ids).join(',');
          return raydium.api.fetchFarmInfoById({ ids });
        },

        async raydiumGetStakingFarmKeysByIds(input: RaydiumPoolByIdsInput): Promise<unknown[]> {
          const raydium = await getRaydium();
          const ids = requireIds(input.ids).join(',');
          return raydium.api.fetchFarmKeysById({ ids });
        },
      };

      const tools: AgentTool[] = [
        {
          name: 'raydium_swap_exact_in',
          description: 'Swap from one token to another on Raydium using best available route.',
          inputSchema: swapExactInSchema,
          execute: (input) => methods.raydiumSwapExactIn(input),
        },
        {
          name: 'raydium_liquidity_create_pool',
          description: 'Create a Raydium CPMM liquidity pool.',
          inputSchema: createPoolSchema,
          execute: (input) => methods.raydiumCreatePool(input),
        },
        {
          name: 'raydium_liquidity_create_farm',
          description: 'Create a Raydium farm for a pool.',
          inputSchema: createFarmSchema,
          execute: (input) => methods.raydiumCreateFarm(input),
        },
        {
          name: 'raydium_liquidity_add',
          description: 'Add liquidity to a Raydium pool.',
          inputSchema: addLiquiditySchema,
          execute: (input) => methods.raydiumAddLiquidity(input),
        },
        {
          name: 'raydium_liquidity_remove',
          description: 'Remove liquidity from a Raydium pool.',
          inputSchema: removeLiquiditySchema,
          execute: (input) => methods.raydiumRemoveLiquidity(input),
        },
        {
          name: 'raydium_liquidity_stake',
          description: 'Stake LP tokens in a Raydium farm.',
          inputSchema: stakeLiquiditySchema,
          execute: (input) => methods.raydiumStakeLiquidity(input),
        },
        {
          name: 'raydium_liquidity_unstake',
          description: 'Unstake LP tokens from a Raydium farm.',
          inputSchema: unstakeLiquiditySchema,
          execute: (input) => methods.raydiumUnstakeLiquidity(input),
        },
        {
          name: 'raydium_liquidity_burn_token',
          description: 'Burn a token amount from the connected wallet (useful for LP burn workflows).',
          inputSchema: burnTokenSchema,
          execute: (input) => methods.raydiumBurnToken(input),
        },
        {
          name: 'raydium_staking_harvest_rewards',
          description: 'Harvest pending rewards across one or more Raydium farms.',
          inputSchema: harvestFarmRewardsSchema,
          execute: (input) => methods.raydiumHarvestFarmRewards(input),
        },
        {
          name: 'raydium_portfolio_summary',
          description: 'Get Raydium portfolio summary including tokens, liquidities, stakes, yields, and assets grouped by pools.',
          inputSchema: walletPortfolioSchema,
          execute: (input) => methods.raydiumGetPortfolioSummary(input),
        },
        {
          name: 'raydium_swap_get_pools_by_mints',
          description: 'Get Raydium swap pools by token mint pair.',
          inputSchema: byMintsSchema,
          execute: (input) => methods.raydiumGetSwapPoolsByMints(input),
        },
        {
          name: 'raydium_swap_get_pools_by_ids',
          description: 'Get Raydium swap pools by pool ids.',
          inputSchema: byIdsSchema,
          execute: (input) => methods.raydiumGetSwapPoolsByIds(input),
        },
        {
          name: 'raydium_liquidity_get_pools',
          description: 'List Raydium pools with filters and sorting.',
          inputSchema: poolQuerySchema,
          execute: (input) => methods.raydiumGetLiquidityPools(input),
        },
        {
          name: 'raydium_liquidity_get_pool_keys',
          description: 'Get Raydium pool key accounts by pool ids.',
          inputSchema: byIdsSchema,
          execute: (input) => methods.raydiumGetLiquidityPoolKeysByIds(input),
        },
        {
          name: 'raydium_liquidity_get_clmm_pool_line',
          description: 'Get CLMM liquidity line data for a Raydium pool.',
          inputSchema: poolLineSchema,
          execute: (input) => methods.raydiumGetClmmPoolLiquidityLine(input),
        },
        {
          name: 'raydium_portfolio_get_token_list',
          description: 'Get Raydium supported token list.',
          inputSchema: z.object({}),
          execute: () => methods.raydiumGetTokenList(),
        },
        {
          name: 'raydium_portfolio_get_token_info',
          description: 'Get Raydium token metadata by mints.',
          inputSchema: tokenInfoSchema,
          execute: (input) => methods.raydiumGetTokenInfo(input),
        },
        {
          name: 'raydium_portfolio_get_wallet_token_balances',
          description: 'Get SPL and Token-2022 balances for a wallet address on Solana.',
          inputSchema: walletPortfolioSchema,
          execute: (input) => methods.raydiumGetWalletTokenBalances(input),
        },
        {
          name: 'raydium_staking_get_farms_by_ids',
          description: 'Get Raydium farm info by farm ids.',
          inputSchema: byIdsSchema,
          execute: (input) => methods.raydiumGetStakingFarmsByIds(input),
        },
        {
          name: 'raydium_staking_get_farm_keys_by_ids',
          description: 'Get Raydium farm key accounts by farm ids.',
          inputSchema: byIdsSchema,
          execute: (input) => methods.raydiumGetStakingFarmKeysByIds(input),
        },
      ];

      return { methods, tools };
    },
  };
}
