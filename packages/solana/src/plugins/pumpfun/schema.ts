import { z } from 'zod';

const mintAddressSchema = z.string().min(32).describe('Token mint address (base58)');
const pubkeySchema = z.string().min(32).describe('Account public key (base58)');
const rawAmountSchema = z.string().regex(/^\d+$/, 'Must be a positive integer').describe('Raw atomic units as integer string');
const percentSchema = z.number().min(0).max(1).describe('Decimal fraction (e.g. 0.05 for 5%)');

export const createTokenSchema = z
    .object({
        name: z.string().min(1).describe('Token name (e.g. "My Token")'),
        symbol: z.string().min(1).max(20).describe('Token symbol (e.g. "MYTKN")'),
        uri: z.string().url().describe('Metadata URI (e.g. from Arweave)'),
        mayhemMode: z.boolean().optional().describe('Use randomized bonding curve parameters'),
        mint: mintAddressSchema.optional().describe('Custom mint keypair (optional, generates new if not provided)'),
    })
    .describe('Create a new pump.fun token on the Solana bonding curve.');

export const buySchema = z
    .object({
        mint: mintAddressSchema.describe('Token mint address to buy'),
        solAmount: rawAmountSchema.describe('Amount of SOL to spend (in lamports, e.g. "100000000" for 0.1 SOL)'),
        slippage: percentSchema.optional().describe('Slippage tolerance (default: 0.01 = 1%)'),
    })
    .describe('Buy tokens from a pump.fun bonding curve using SOL.');

export const sellSchema = z
    .object({
        mint: mintAddressSchema.describe('Token mint address to sell'),
        tokenAmount: rawAmountSchema.describe('Amount of tokens to sell (in raw atomic units)'),
        slippage: percentSchema.optional().describe('Slippage tolerance (default: 0.01 = 1%)'),
    })
    .describe('Sell tokens back to a pump.fun bonding curve for SOL.');

export const getTokenInfoSchema = z
    .object({
        mint: mintAddressSchema.describe('Token mint address'),
    })
    .describe('Get comprehensive bonding curve information for a pump.fun token.');

export const getPriceSchema = z
    .object({
        mint: mintAddressSchema.describe('Token mint address'),
    })
    .describe('Get current buy and sell prices for a pump.fun token.');

export const checkGraduationSchema = z
    .object({
        mint: mintAddressSchema.describe('Token mint address'),
    })
    .describe('Check graduation progress from bonding curve to AMM pool.');

export const createFeeConfigSchema = z
    .object({
        mint: mintAddressSchema.describe('Token mint address'),
        pool: pubkeySchema.optional().describe('AMM pool address (required for graduated tokens)'),
    })
    .describe('Create a fee sharing configuration for a pump.fun token.');

export const updateFeeSharesSchema = z
    .object({
        mint: mintAddressSchema.describe('Token mint address'),
        shareholders: z
            .array(
                z.object({
                    address: pubkeySchema.describe('Shareholder wallet address'),
                    shareBps: z.number().int().min(1).max(10000).describe('Share in basis points (must total 10000)'),
                }),
            )
            .min(1)
            .max(10)
            .describe('Array of shareholders and their BPS shares. Must total exactly 10000 BPS (100%).'),
    })
    .describe('Update fee sharing configuration for a pump.fun token.');

export const getFeeConfigSchema = z
    .object({
        mint: mintAddressSchema.describe('Token mint address'),
    })
    .describe('Get the current fee sharing configuration for a pump.fun token.');

export const getRewardsSchema = z
    .object({
        mint: mintAddressSchema.describe('Token mint address'),
    })
    .describe('Get unclaimed $PUMP token rewards for a pump.fun token.');

export const getBuyPriceImpactSchema = z
    .object({
        mint: mintAddressSchema.describe('Token mint address'),
        solAmount: rawAmountSchema.describe('SOL amount to buy with (in lamports)'),
    })
    .describe('Calculate price impact before buying tokens on pump.fun.');

export const getSellPriceImpactSchema = z
    .object({
        mint: mintAddressSchema.describe('Token mint address'),
        tokenAmount: rawAmountSchema.describe('Token amount to sell (in raw atomic units)'),
    })
    .describe('Calculate price impact before selling tokens on pump.fun.');
