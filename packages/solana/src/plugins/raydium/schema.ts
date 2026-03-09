import { z } from 'zod';

export const rawAmountSchema = z
  .string()
  .regex(/^\d+$/, 'Must be a positive integer in base units')
  .describe('Base-unit amount (atomic units)');

export const amountSchema = z
  .union([z.number().positive(), z.string().min(1)])
  .describe('Human-readable token amount (e.g. "1.5")');

export const poolQuerySchema = z.object({
  type: z.enum(['all', 'concentrated', 'standard', 'allFarm', 'standardFarm', 'concentratedFarm']).optional(),
  sort: z.enum(['liquidity', 'volume24h', 'volume7d', 'volume30d', 'fee24h', 'fee7d', 'fee30d', 'apr24h', 'apr7d', 'apr30d']).optional(),
  order: z.enum(['desc', 'asc']).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(200).optional(),
});

export const byMintsSchema = poolQuerySchema.extend({
  mint1: z.string().describe('Input token mint address'),
  mint2: z.string().optional().describe('Optional output token mint address'),
});

export const byIdsSchema = z.object({
  ids: z.array(z.string()).min(1).describe('Pool/farm ids'),
});

export const poolLineSchema = z.object({
  poolId: z.string().describe('CLMM pool id'),
});

export const tokenInfoSchema = z.object({
  mints: z.array(z.string()).min(1).describe('Mint addresses'),
});

export const walletPortfolioSchema = z.object({
  address: z.string().optional().describe('Wallet address. Defaults to the current wallet address.'),
});

export const swapExactInSchema = z.object({
  inputMint: z.string().describe('Input mint address'),
  outputMint: z.string().describe('Output mint address'),
  amount: amountSchema.optional(),
  amountRaw: rawAmountSchema.optional(),
  slippageBps: z.number().int().min(1).max(5000).optional().describe('Slippage tolerance in basis points. Default: 50'),
});

export const createPoolSchema = z.object({
  mintA: z.string().describe('Token A mint address'),
  mintB: z.string().describe('Token B mint address'),
  amountA: amountSchema.optional(),
  amountARaw: rawAmountSchema.optional(),
  amountB: amountSchema.optional(),
  amountBRaw: rawAmountSchema.optional(),
  startTime: z.number().int().optional().describe('Pool start time (unix seconds). Defaults to now.'),
  feeConfigId: z.string().optional().describe('Optional CPMM config id from Raydium'),
});

export const createFarmSchema = z.object({
  poolId: z.string().describe('Raydium pool id for LP farm creation'),
  programId: z.string().optional().describe('Optional farm program id'),
  rewards: z
    .array(
      z.object({
        mint: z.string().describe('Reward mint address'),
        perSecond: z.string().describe('Reward emission per second in raw units'),
        openTime: z.number().int().describe('Reward start time (unix seconds)'),
        endTime: z.number().int().describe('Reward end time (unix seconds)'),
        rewardType: z.enum(['Standard SPL', 'Option tokens']).optional(),
      }),
    )
    .min(1)
    .describe('Farm rewards configuration'),
});

export const burnTokenSchema = z.object({
  mint: z.string().describe('Token mint to burn'),
  amount: amountSchema.optional(),
  amountRaw: rawAmountSchema.optional(),
  owner: z.string().optional().describe('Owner wallet address. Defaults to current wallet.'),
});

export const addLiquiditySchema = z.object({
  poolId: z.string().describe('Raydium pool id'),
  amount: amountSchema.optional(),
  amountRaw: rawAmountSchema.optional(),
  baseIn: z.boolean().optional().describe('Whether input amount is token A/base side. Default: true.'),
  slippageBps: z.number().int().min(1).max(5000).optional().describe('Slippage tolerance in basis points. Default: 50'),
});

export const removeLiquiditySchema = z.object({
  poolId: z.string().describe('Raydium pool id'),
  lpAmount: amountSchema.optional(),
  lpAmountRaw: rawAmountSchema.optional(),
  slippageBps: z.number().int().min(1).max(5000).optional().describe('Slippage tolerance in basis points. Default: 50'),
});

export const stakeLiquiditySchema = z.object({
  farmId: z.string().describe('Raydium farm id'),
  amount: amountSchema.optional(),
  amountRaw: rawAmountSchema.optional(),
});

export const unstakeLiquiditySchema = z.object({
  farmId: z.string().describe('Raydium farm id'),
  amount: amountSchema.optional(),
  amountRaw: rawAmountSchema.optional(),
});

export const harvestFarmRewardsSchema = z.object({
  farmIds: z.array(z.string()).min(1).describe('Farm ids to harvest rewards from'),
});
