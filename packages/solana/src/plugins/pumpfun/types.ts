import { z } from 'zod';
import type {
    createTokenSchema,
    buySchema,
    sellSchema,
    getTokenInfoSchema,
    getPriceSchema,
    checkGraduationSchema,
    createFeeConfigSchema,
    updateFeeSharesSchema,
    getFeeConfigSchema,
    getRewardsSchema,
    getBuyPriceImpactSchema,
    getSellPriceImpactSchema,
} from './schema';

export interface PumpfunPluginConfig {
    rpcUrl?: string;
}

export interface PumpfunTxResult {
    signature: string;
    explorerUrl: string;
}

export type PumpfunCreateTokenInput = z.infer<typeof createTokenSchema>;
export type PumpfunCreateTokenResult = PumpfunTxResult & { mint: string };

export type PumpfunBuyInput = z.infer<typeof buySchema>;
export type PumpfunBuyResult = PumpfunTxResult & { tokenAmount: string; solAmount: string };

export type PumpfunSellInput = z.infer<typeof sellSchema>;
export type PumpfunSellResult = PumpfunTxResult & { tokenAmount: string; solAmount: string };

export type PumpfunGetTokenInfoInput = z.infer<typeof getTokenInfoSchema>;
export interface PumpfunTokenInfo {
    mint: string;
    name?: string;
    symbol?: string;
    uri?: string;
    marketCap: string;
    tokenTotalSupply: string;
    circulatingSupply: string;
    isGraduated: boolean;
    progressBps: number;
    bondingCurveComplete: boolean;
    virtualSolReserves: string;
    virtualTokenReserves: string;
}

export type PumpfunGetPriceInput = z.infer<typeof getPriceSchema>;
export interface PumpfunPriceInfo {
    mint: string;
    buyPricePerToken: string;
    sellPricePerToken: string;
    marketCap: string;
}

export type PumpfunCheckGraduationInput = z.infer<typeof checkGraduationSchema>;
export interface PumpfunGraduationInfo {
    mint: string;
    isGraduated: boolean;
    progressBps: number;
    tokensRemaining: string;
    solAccumulated: string;
    targetSol: string;
}

export type PumpfunCreateFeeConfigInput = z.infer<typeof createFeeConfigSchema>;
export type PumpfunCreateFeeConfigResult = PumpfunTxResult & { feeConfigAddress: string };

export type PumpfunUpdateFeeSharesInput = z.infer<typeof updateFeeSharesSchema>;
export type PumpfunUpdateFeeSharesResult = PumpfunTxResult;

export type PumpfunGetFeeConfigInput = z.infer<typeof getFeeConfigSchema>;
export interface FeeShare {
    address: string;
    shareBps: number;
}
export interface PumpfunFeeConfig {
    mint: string;
    authority: string;
    pool: string | null;
    shareholders: FeeShare[];
    totalShareBps: number;
}

export type PumpfunGetRewardsInput = z.infer<typeof getRewardsSchema>;
export interface PumpfunRewardsInfo {
    mint: string;
    totalUnclaimedTokens: string;
    currentDayTokens: string;
}

export type PumpfunGetBuyPriceImpactInput = z.infer<typeof getBuyPriceImpactSchema>;
export interface PumpfunPriceImpactResult {
    newMarketCap: string;
    priceImpactBps: number;
    pricePerToken: string;
    tokensReceived: string;
}

export type PumpfunGetSellPriceImpactInput = z.infer<typeof getSellPriceImpactSchema>;

export type PumpfunMethods = {
    pumpfunCreateToken(input: PumpfunCreateTokenInput): Promise<PumpfunCreateTokenResult>;
    pumpfunBuy(input: PumpfunBuyInput): Promise<PumpfunBuyResult>;
    pumpfunSell(input: PumpfunSellInput): Promise<PumpfunSellResult>;
    pumpfunGetTokenInfo(input: PumpfunGetTokenInfoInput): Promise<PumpfunTokenInfo>;
    pumpfunGetPrice(input: PumpfunGetPriceInput): Promise<PumpfunPriceInfo>;
    pumpfunCheckGraduation(input: PumpfunCheckGraduationInput): Promise<PumpfunGraduationInfo>;
    pumpfunCreateFeeConfig(input: PumpfunCreateFeeConfigInput): Promise<PumpfunCreateFeeConfigResult>;
    pumpfunUpdateFeeShares(input: PumpfunUpdateFeeSharesInput): Promise<PumpfunUpdateFeeSharesResult>;
    pumpfunGetFeeConfig(input: PumpfunGetFeeConfigInput): Promise<PumpfunFeeConfig>;
    pumpfunGetRewards(input: PumpfunGetRewardsInput): Promise<PumpfunRewardsInfo>;
    pumpfunGetBuyPriceImpact(input: PumpfunGetBuyPriceImpactInput): Promise<PumpfunPriceImpactResult>;
    pumpfunGetSellPriceImpact(input: PumpfunGetSellPriceImpactInput): Promise<PumpfunPriceImpactResult>;
};
