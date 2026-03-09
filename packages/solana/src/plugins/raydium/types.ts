export type RaydiumCluster = 'mainnet' | 'devnet';

export interface RaydiumPluginConfig {
  /** Raydium API cluster. Defaults to inference from wallet RPC endpoint. */
  cluster?: RaydiumCluster;
  /** Skip loading Raydium token list during startup. Defaults to true for faster init. */
  disableLoadToken?: boolean;
  /** API timeout in milliseconds. */
  apiRequestTimeout?: number;
  /** API cache interval in milliseconds. */
  apiRequestInterval?: number;
}

export interface RaydiumPoolQueryInput {
  type?: 'all' | 'concentrated' | 'standard' | 'allFarm' | 'standardFarm' | 'concentratedFarm';
  sort?: 'liquidity' | 'volume24h' | 'volume7d' | 'volume30d' | 'fee24h' | 'fee7d' | 'fee30d' | 'apr24h' | 'apr7d' | 'apr30d';
  order?: 'desc' | 'asc';
  page?: number;
  pageSize?: number;
}

export interface RaydiumPoolByMintsInput extends RaydiumPoolQueryInput {
  mint1: string;
  mint2?: string;
}

export interface RaydiumPoolByIdsInput {
  ids: string[];
}

export interface RaydiumTokenInfoInput {
  mints: string[];
}

export interface RaydiumPoolLiquidityLineInput {
  poolId: string;
}

export interface RaydiumSwapExactInInput {
  inputMint: string;
  outputMint: string;
  amount?: number | string;
  amountRaw?: string;
  slippageBps?: number;
}

export interface RaydiumSwapResult {
  signatures: string[];
  explorerUrls: string[];
  inputMint: string;
  outputMint: string;
  amountInRaw: string;
  amountOutRaw: string;
  minAmountOutRaw: string;
  routeType: 'amm' | 'route';
}

export interface RaydiumCreatePoolInput {
  mintA: string;
  mintB: string;
  amountA?: number | string;
  amountB?: number | string;
  amountARaw?: string;
  amountBRaw?: string;
  startTime?: number;
  feeConfigId?: string;
}

export interface RaydiumCreateFarmRewardInput {
  mint: string;
  perSecond: string;
  openTime: number;
  endTime: number;
  rewardType?: 'Standard SPL' | 'Option tokens';
}

export interface RaydiumCreateFarmInput {
  poolId: string;
  programId?: string;
  rewards: RaydiumCreateFarmRewardInput[];
}

export interface RaydiumBurnTokenInput {
  mint: string;
  amount?: number | string;
  amountRaw?: string;
  owner?: string;
}

export interface RaydiumAddLiquidityInput {
  poolId: string;
  amount?: number | string;
  amountRaw?: string;
  baseIn?: boolean;
  slippageBps?: number;
}

export interface RaydiumRemoveLiquidityInput {
  poolId: string;
  lpAmount?: number | string;
  lpAmountRaw?: string;
  slippageBps?: number;
}

export interface RaydiumStakeLiquidityInput {
  farmId: string;
  amount?: number | string;
  amountRaw?: string;
}

export interface RaydiumUnstakeLiquidityInput {
  farmId: string;
  amount?: number | string;
  amountRaw?: string;
}

export interface RaydiumHarvestFarmRewardsInput {
  farmIds: string[];
}

export interface RaydiumWalletPortfolioInput {
  address?: string;
}

export interface RaydiumWalletTokenBalance {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  tokenProgram: string;
}

export interface RaydiumPortfolioSummary {
  tokens: RaydiumWalletTokenBalance[];
  assetsByToken: Record<string, string>;
  liquidities: unknown[];
  stakes: unknown[];
  yields: unknown[];
  assetByPools: Record<string, unknown>;
}

export interface RaydiumMethods {
  // Actions
  raydiumSwapExactIn(input: RaydiumSwapExactInInput): Promise<RaydiumSwapResult>;
  raydiumCreatePool(input: RaydiumCreatePoolInput): Promise<{ signatures: string[]; explorerUrls: string[]; pool: unknown }>;
  raydiumCreateFarm(input: RaydiumCreateFarmInput): Promise<{ signatures: string[]; explorerUrls: string[]; farm: unknown }>;
  raydiumBurnToken(input: RaydiumBurnTokenInput): Promise<{ signature: string; explorerUrl: string; mint: string; rawAmount: string }>;
  raydiumAddLiquidity(input: RaydiumAddLiquidityInput): Promise<{ signatures: string[]; explorerUrls: string[]; poolId: string }>;
  raydiumRemoveLiquidity(input: RaydiumRemoveLiquidityInput): Promise<{ signatures: string[]; explorerUrls: string[]; poolId: string }>;
  raydiumStakeLiquidity(input: RaydiumStakeLiquidityInput): Promise<{ signatures: string[]; explorerUrls: string[]; farmId: string }>;
  raydiumUnstakeLiquidity(input: RaydiumUnstakeLiquidityInput): Promise<{ signatures: string[]; explorerUrls: string[]; farmId: string }>;
  raydiumHarvestFarmRewards(input: RaydiumHarvestFarmRewardsInput): Promise<{ signatures: string[]; explorerUrls: string[] }>;

  // Swap
  raydiumGetSwapPoolsByMints(input: RaydiumPoolByMintsInput): Promise<unknown>;
  raydiumGetSwapPoolsByIds(input: RaydiumPoolByIdsInput): Promise<unknown[]>;

  // Liquidity
  raydiumGetLiquidityPools(input?: RaydiumPoolQueryInput): Promise<unknown>;
  raydiumGetLiquidityPoolKeysByIds(input: RaydiumPoolByIdsInput): Promise<unknown[]>;
  raydiumGetClmmPoolLiquidityLine(input: RaydiumPoolLiquidityLineInput): Promise<{ price: string; liquidity: string }[]>;

  // Portfolio
  raydiumGetTokenList(): Promise<{ mintList: unknown[]; blacklist: string[]; whiteList: string[] }>;
  raydiumGetTokenInfo(input: RaydiumTokenInfoInput): Promise<unknown[]>;
  raydiumGetWalletTokenBalances(input?: RaydiumWalletPortfolioInput): Promise<RaydiumWalletTokenBalance[]>;
  raydiumGetPortfolioSummary(input?: RaydiumWalletPortfolioInput): Promise<RaydiumPortfolioSummary>;

  // Staking
  raydiumGetStakingFarmsByIds(input: RaydiumPoolByIdsInput): Promise<unknown[]>;
  raydiumGetStakingFarmKeysByIds(input: RaydiumPoolByIdsInput): Promise<unknown[]>;
}
