import type { WalletPlugin, AgentTool } from '@agentic-wallet/core';
import { AgentWalletError } from '@agentic-wallet/core';
import { Connection, PublicKey, Transaction, VersionedTransaction, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import {
    OnlinePumpSdk,
    PUMP_SDK,
    getBuyTokenAmountFromSolAmount,
    getSellSolAmountFromTokenAmount,
    bondingCurveMarketCap,
    getBuySolAmountFromTokenAmount,
} from '@pump-fun/pump-sdk';
import type { SolanaAgentWallet } from '../../wallet';
import { toExplorerTxUrl } from '../../utils';
import type {
    PumpfunPluginConfig,
    PumpfunMethods,
    PumpfunCreateTokenInput,
    PumpfunCreateTokenResult,
    PumpfunBuyInput,
    PumpfunBuyResult,
    PumpfunSellInput,
    PumpfunSellResult,
    PumpfunTokenInfo,
    PumpfunPriceInfo,
    PumpfunGraduationInfo,
    PumpfunCreateFeeConfigInput,
    PumpfunCreateFeeConfigResult,
    PumpfunUpdateFeeSharesInput,
    PumpfunUpdateFeeSharesResult,
    PumpfunFeeConfig,
    PumpfunRewardsInfo,
    PumpfunPriceImpactResult,
} from './types';
import {
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

function computePricePerToken(virtualSolReserves: BN, virtualTokenReserves: BN): BN {
    if (virtualTokenReserves.isZero()) return new BN(0);
    return virtualSolReserves.mul(new BN(10 ** 6)).div(virtualTokenReserves);
}

async function resolveTokenProgram(connection: Connection, mint: PublicKey): Promise<PublicKey> {
    try {
        const mintInfo = await connection.getParsedAccountInfo(mint, 'confirmed');
        if (mintInfo.value?.data && 'parsed' in mintInfo.value.data) {
            const programId = mintInfo.value.owner;
            if (programId.equals(TOKEN_2022_PROGRAM_ID)) {
                return TOKEN_2022_PROGRAM_ID;
            }
        }
    } catch {
        // ignore
    }
    return TOKEN_PROGRAM_ID;
}

export function pumpfunPlugin(config?: PumpfunPluginConfig): WalletPlugin<SolanaAgentWallet, PumpfunMethods> {
    return {
        name: 'pumpfun',
        register(wallet) {
            const offlineSdk = PUMP_SDK;
            const onlineSdk = new OnlinePumpSdk(wallet.connection);
            const walletPublicKey = new PublicKey(wallet.address);

            const methods: PumpfunMethods = {

                async pumpfunCreateToken(input: PumpfunCreateTokenInput): Promise<PumpfunCreateTokenResult> {
                    const mintKeypair = input.mint ? Keypair.fromSecretKey(new Uint8Array(JSON.parse(input.mint))) : Keypair.generate();

                    const instructions = await offlineSdk.createV2Instruction({
                        mint: mintKeypair.publicKey,
                        name: input.name,
                        symbol: input.symbol,
                        uri: input.uri,
                        creator: walletPublicKey,
                        user: walletPublicKey,
                        mayhemMode: input.mayhemMode ?? false,
                    });

                    const tx = new Transaction();
                    tx.add(instructions);
                    tx.feePayer = walletPublicKey;
                    const latestBlockhash = await wallet.connection.getLatestBlockhash('confirmed');
                    tx.recentBlockhash = latestBlockhash.blockhash;

                    const result = await wallet.provider.signAndSendTransaction?.(tx);

                    return {
                        signature: result?.signature ?? '',
                        explorerUrl: result ? toExplorerTxUrl(result.signature, wallet.explorerCluster) : '',
                        mint: mintKeypair.publicKey.toString(),
                    };
                },

                async pumpfunBuy(input: PumpfunBuyInput): Promise<PumpfunBuyResult> {
                    const mint = new PublicKey(input.mint);
                    const user = walletPublicKey;
                    const solAmount = new BN(input.solAmount);
                    const slippage = input.slippage ?? 0.01;

                    const [buyState, global, feeConfig] = await Promise.all([
                        onlineSdk.fetchBuyState(mint, user),
                        onlineSdk.fetchGlobal(),
                        onlineSdk.fetchFeeConfig(),
                    ]);

                    if (buyState.bondingCurve.complete) {
                        throw new AgentWalletError('INVALID_ACTION', 'Token has graduated to AMM');
                    }

                    const tokenProgram = await resolveTokenProgram(wallet.connection, mint);

                    const expectedTokens = getBuyTokenAmountFromSolAmount({
                        global,
                        feeConfig,
                        mintSupply: buyState.bondingCurve.tokenTotalSupply,
                        bondingCurve: buyState.bondingCurve,
                        amount: solAmount,
                    });

                    const instructions = await offlineSdk.buyInstructions({
                        global,
                        bondingCurveAccountInfo: buyState.bondingCurveAccountInfo,
                        bondingCurve: buyState.bondingCurve,
                        associatedUserAccountInfo: buyState.associatedUserAccountInfo,
                        mint,
                        user,
                        amount: expectedTokens,
                        solAmount,
                        slippage,
                        tokenProgram,
                    });

                    const tx = new Transaction();
                    for (const ix of instructions) {
                        tx.add(ix);
                    }
                    tx.feePayer = user;
                    const latestBlockhash = await wallet.connection.getLatestBlockhash('confirmed');
                    tx.recentBlockhash = latestBlockhash.blockhash;

                    const result = await wallet.provider.signAndSendTransaction?.(tx);

                    return {
                        explorerUrl: result ? toExplorerTxUrl(result.signature, wallet.explorerCluster) : '',
                        signature: result?.signature ?? '',
                        tokenAmount: expectedTokens.toString(),
                        solAmount: solAmount.toString(),
                    };
                },

                async pumpfunSell(input: PumpfunSellInput): Promise<PumpfunSellResult> {
                    const mint = new PublicKey(input.mint);
                    const user = walletPublicKey;
                    const tokenAmount = new BN(input.tokenAmount);
                    const slippage = input.slippage ?? 0.01;

                    const [sellState, global, feeConfig] = await Promise.all([
                        onlineSdk.fetchSellState(mint, user),
                        onlineSdk.fetchGlobal(),
                        onlineSdk.fetchFeeConfig(),
                    ]);

                    if (sellState.bondingCurve.complete) {
                        throw new AgentWalletError('INVALID_ACTION', 'Token has graduated to AMM');
                    }

                    const tokenProgram = await resolveTokenProgram(wallet.connection, mint);

                    const expectedSol = getSellSolAmountFromTokenAmount({
                        global,
                        feeConfig,
                        mintSupply: sellState.bondingCurve.tokenTotalSupply,
                        bondingCurve: sellState.bondingCurve,
                        amount: tokenAmount,
                    });

                    const instructions = await offlineSdk.sellInstructions({
                        global,
                        bondingCurveAccountInfo: sellState.bondingCurveAccountInfo,
                        bondingCurve: sellState.bondingCurve,
                        mint,
                        user,
                        amount: tokenAmount,
                        solAmount: expectedSol,
                        slippage,
                        tokenProgram,
                        mayhemMode: sellState.bondingCurve.isMayhemMode,
                    });

                    const tx = new Transaction().add(...instructions);
                    tx.feePayer = user;
                    const latestBlockhash = await wallet.connection.getLatestBlockhash('confirmed');
                    tx.recentBlockhash = latestBlockhash.blockhash;

                    const result = await wallet.provider.signAndSendTransaction?.(tx);

                    return {
                        explorerUrl: result ? toExplorerTxUrl(result.signature, wallet.explorerCluster) : '',
                        signature: result?.signature ?? '',
                        tokenAmount: tokenAmount.toString(),
                        solAmount: expectedSol.toString(),
                    };
                },

                async pumpfunGetTokenInfo(input: { mint: string }): Promise<PumpfunTokenInfo> {
                    const mint = new PublicKey(input.mint);

                    const [buyState, global] = await Promise.all([
                        onlineSdk.fetchBuyState(mint, walletPublicKey),
                        onlineSdk.fetchGlobal(),
                    ]);

                    const bondingCurve = buyState.bondingCurve;

                    const marketCap = bondingCurveMarketCap({
                        mintSupply: bondingCurve.tokenTotalSupply,
                        virtualSolReserves: bondingCurve.virtualSolReserves,
                        virtualTokenReserves: bondingCurve.virtualTokenReserves,
                    });

                    return {
                        mint: input.mint,
                        marketCap: marketCap.toString(),
                        tokenTotalSupply: bondingCurve.tokenTotalSupply.toString(),
                        circulatingSupply: bondingCurve.realTokenReserves.toString(),
                        isGraduated: bondingCurve.complete,
                        progressBps: bondingCurve.complete ? 10000 : 0,
                        bondingCurveComplete: bondingCurve.complete,
                        virtualSolReserves: bondingCurve.virtualSolReserves.toString(),
                        virtualTokenReserves: bondingCurve.virtualTokenReserves.toString(),
                    };
                },

                async pumpfunGetPrice(input: { mint: string }): Promise<PumpfunPriceInfo> {
                    const mint = new PublicKey(input.mint);

                    const [buyState, global, feeConfig] = await Promise.all([
                        onlineSdk.fetchBuyState(mint, walletPublicKey),
                        onlineSdk.fetchGlobal(),
                        onlineSdk.fetchFeeConfig(),
                    ]);

                    const buyPricePerToken = computePricePerToken(
                        buyState.bondingCurve.virtualSolReserves,
                        buyState.bondingCurve.virtualTokenReserves,
                    );

                    const oneToken = new BN(1);
                    const sellPricePerToken = getBuySolAmountFromTokenAmount({
                        global,
                        feeConfig,
                        mintSupply: buyState.bondingCurve.tokenTotalSupply,
                        bondingCurve: buyState.bondingCurve,
                        amount: oneToken.mul(new BN(10 ** 6)),
                    });

                    const marketCap = bondingCurveMarketCap({
                        mintSupply: buyState.bondingCurve.tokenTotalSupply,
                        virtualSolReserves: buyState.bondingCurve.virtualSolReserves,
                        virtualTokenReserves: buyState.bondingCurve.virtualTokenReserves,
                    });

                    return {
                        mint: input.mint,
                        buyPricePerToken: buyPricePerToken.toString(),
                        sellPricePerToken: sellPricePerToken.toString(),
                        marketCap: marketCap.toString(),
                    };
                },

                async pumpfunCheckGraduation(input: { mint: string }): Promise<PumpfunGraduationInfo> {
                    const mint = new PublicKey(input.mint);

                    const [buyState, global] = await Promise.all([
                        onlineSdk.fetchBuyState(mint, walletPublicKey),
                        onlineSdk.fetchGlobal(),
                    ]);

                    const bondingCurve = buyState.bondingCurve;

                    const isGraduated = bondingCurve.complete;
                    const progressBps = isGraduated ? 10000 : 0;
                    const tokensRemaining = bondingCurve.realTokenReserves;
                    const solAccumulated = bondingCurve.realSolReserves;

                    return {
                        mint: input.mint,
                        isGraduated,
                        progressBps,
                        tokensRemaining: tokensRemaining.toString(),
                        solAccumulated: solAccumulated.toString(),
                        targetSol: global.initialVirtualSolReserves.toString(),
                    };
                },

                async pumpfunCreateFeeConfig(input: PumpfunCreateFeeConfigInput): Promise<PumpfunCreateFeeConfigResult> {
                    const mint = new PublicKey(input.mint);
                    const pool = input.pool ? new PublicKey(input.pool) : null;

                    const instruction = await offlineSdk.createFeeSharingConfig({
                        creator: walletPublicKey,
                        mint,
                        pool,
                    });

                    const tx = new Transaction();
                    tx.add(instruction);
                    tx.feePayer = walletPublicKey;
                    const latestBlockhash = await wallet.connection.getLatestBlockhash('confirmed');
                    tx.recentBlockhash = latestBlockhash.blockhash;

                    const result = await wallet.provider.signAndSendTransaction?.(tx);

                    return {
                        explorerUrl: result ? toExplorerTxUrl(result.signature, wallet.explorerCluster) : '',
                        signature: result?.signature ?? '',
                        feeConfigAddress: '',
                    };
                },

                async pumpfunUpdateFeeShares(input: PumpfunUpdateFeeSharesInput): Promise<PumpfunUpdateFeeSharesResult> {
                    const mint = new PublicKey(input.mint);

                    const totalBps = input.shareholders.reduce((sum, s) => sum + s.shareBps, 0);
                    if (totalBps !== 10000) {
                        throw new AgentWalletError('INVALID_ACTION', `Share totals must equal 10000 BPS, got ${totalBps}`);
                    }

                    const instruction = await offlineSdk.updateFeeShares({
                        authority: walletPublicKey,
                        mint,
                        currentShareholders: [],
                        newShareholders: input.shareholders.map(s => ({
                            address: new PublicKey(s.address),
                            shareBps: s.shareBps,
                        })),
                    });

                    const tx = new Transaction().add(instruction);
                    tx.feePayer = walletPublicKey;
                    const latestBlockhash = await wallet.connection.getLatestBlockhash('confirmed');
                    tx.recentBlockhash = latestBlockhash.blockhash;

                    const result = await wallet.provider.signAndSendTransaction?.(tx);

                    return {
                        explorerUrl: result ? toExplorerTxUrl(result.signature, wallet.explorerCluster) : '',
                        signature: result?.signature ?? '',
                    }
                },

                async pumpfunGetFeeConfig(input: { mint: string }): Promise<PumpfunFeeConfig> {
                    const feeConfig = await onlineSdk.fetchFeeConfig();

                    return {
                        mint: input.mint,
                        authority: feeConfig.admin.toString(),
                        pool: null,
                        shareholders: [],
                        totalShareBps: Number(feeConfig.flatFees.creatorFeeBps),
                    };
                },

                async pumpfunGetRewards(input: { mint: string }): Promise<PumpfunRewardsInfo> {
                    const user = walletPublicKey;

                    const [unclaimed, daily] = await Promise.all([
                        onlineSdk.getTotalUnclaimedTokens(user),
                        onlineSdk.getCurrentDayTokens(user),
                    ]);

                    return {
                        mint: input.mint,
                        totalUnclaimedTokens: unclaimed.toString(),
                        currentDayTokens: daily.toString(),
                    };
                },

                async pumpfunGetBuyPriceImpact(input: { mint: string; solAmount: string }): Promise<PumpfunPriceImpactResult> {
                    const mint = new PublicKey(input.mint);
                    const solAmount = new BN(input.solAmount);

                    const [buyState, global, feeConfig] = await Promise.all([
                        onlineSdk.fetchBuyState(mint, walletPublicKey),
                        onlineSdk.fetchGlobal(),
                        onlineSdk.fetchFeeConfig(),
                    ]);

                    const tokensReceived = getBuyTokenAmountFromSolAmount({
                        global,
                        feeConfig,
                        mintSupply: buyState.bondingCurve.tokenTotalSupply,
                        bondingCurve: buyState.bondingCurve,
                        amount: solAmount,
                    });

                    const pricePerToken = computePricePerToken(
                        buyState.bondingCurve.virtualSolReserves,
                        buyState.bondingCurve.virtualTokenReserves,
                    );

                    const currentMarketCap = bondingCurveMarketCap({
                        mintSupply: buyState.bondingCurve.tokenTotalSupply,
                        virtualSolReserves: buyState.bondingCurve.virtualSolReserves,
                        virtualTokenReserves: buyState.bondingCurve.virtualTokenReserves,
                    });

                    const newMarketCap = currentMarketCap.add(solAmount);
                    const priceImpactBps = currentMarketCap.isZero()
                        ? 0
                        : Math.floor(newMarketCap.sub(currentMarketCap).muln(10000).div(currentMarketCap).toNumber());

                    return {
                        newMarketCap: newMarketCap.toString(),
                        priceImpactBps,
                        pricePerToken: pricePerToken.toString(),
                        tokensReceived: tokensReceived.toString(),
                    };
                },

                async pumpfunGetSellPriceImpact(input: { mint: string; tokenAmount: string }): Promise<PumpfunPriceImpactResult> {
                    const mint = new PublicKey(input.mint);
                    const tokenAmount = new BN(input.tokenAmount);

                    const [sellState, global, feeConfig] = await Promise.all([
                        onlineSdk.fetchSellState(mint, walletPublicKey),
                        onlineSdk.fetchGlobal(),
                        onlineSdk.fetchFeeConfig(),
                    ]);

                    const solReceived = getSellSolAmountFromTokenAmount({
                        global,
                        feeConfig,
                        mintSupply: sellState.bondingCurve.tokenTotalSupply,
                        bondingCurve: sellState.bondingCurve,
                        amount: tokenAmount,
                    });

                    const pricePerToken = computePricePerToken(
                        sellState.bondingCurve.virtualSolReserves,
                        sellState.bondingCurve.virtualTokenReserves,
                    );

                    const currentMarketCap = bondingCurveMarketCap({
                        mintSupply: sellState.bondingCurve.tokenTotalSupply,
                        virtualSolReserves: sellState.bondingCurve.virtualSolReserves,
                        virtualTokenReserves: sellState.bondingCurve.virtualTokenReserves,
                    });

                    const newMarketCap = currentMarketCap.isZero() ? new BN(0) : currentMarketCap.sub(solReceived);
                    const priceImpactBps = currentMarketCap.isZero()
                        ? 0
                        : Math.floor(currentMarketCap.sub(newMarketCap).muln(10000).div(currentMarketCap).toNumber());

                    return {
                        newMarketCap: newMarketCap.toString(),
                        priceImpactBps,
                        pricePerToken: pricePerToken.toString(),
                        tokensReceived: solReceived.toString(),
                    };
                },
            };

            const tools: AgentTool[] = [
                {
                    name: 'pumpfun_create_token',
                    description: createTokenSchema.description ?? 'Create a new pump.fun token on the Solana bonding curve.',
                    inputSchema: createTokenSchema,
                    execute: (input) => methods.pumpfunCreateToken(input),
                },
                {
                    name: 'pumpfun_buy',
                    description: buySchema.description ?? 'Buy tokens from a pump.fun bonding curve using SOL.',
                    inputSchema: buySchema,
                    execute: (input) => methods.pumpfunBuy(input),
                },
                {
                    name: 'pumpfun_sell',
                    description: sellSchema.description ?? 'Sell tokens back to a pump.fun bonding curve for SOL.',
                    inputSchema: sellSchema,
                    execute: (input) => methods.pumpfunSell(input),
                },
                {
                    name: 'pumpfun_get_token_info',
                    description: getTokenInfoSchema.description ?? 'Get comprehensive bonding curve information for a pump.fun token.',
                    inputSchema: getTokenInfoSchema,
                    execute: (input) => methods.pumpfunGetTokenInfo(input),
                },
                {
                    name: 'pumpfun_get_price',
                    description: getPriceSchema.description ?? 'Get current buy and sell prices for a pump.fun token.',
                    inputSchema: getPriceSchema,
                    execute: (input) => methods.pumpfunGetPrice(input),
                },
                {
                    name: 'pumpfun_check_graduation',
                    description: checkGraduationSchema.description ?? 'Check graduation progress from bonding curve to AMM pool.',
                    inputSchema: checkGraduationSchema,
                    execute: (input) => methods.pumpfunCheckGraduation(input),
                },
                {
                    name: 'pumpfun_create_fee_config',
                    description: createFeeConfigSchema.description ?? 'Create a fee sharing configuration for a pump.fun token.',
                    inputSchema: createFeeConfigSchema,
                    execute: (input) => methods.pumpfunCreateFeeConfig(input),
                },
                {
                    name: 'pumpfun_update_fee_shares',
                    description: updateFeeSharesSchema.description ?? 'Update fee sharing configuration for a pump.fun token.',
                    inputSchema: updateFeeSharesSchema,
                    execute: (input) => methods.pumpfunUpdateFeeShares(input),
                },
                {
                    name: 'pumpfun_get_fee_config',
                    description: getFeeConfigSchema.description ?? 'Get the current fee sharing configuration for a pump.fun token.',
                    inputSchema: getFeeConfigSchema,
                    execute: (input) => methods.pumpfunGetFeeConfig(input),
                },
                {
                    name: 'pumpfun_get_rewards',
                    description: getRewardsSchema.description ?? 'Get unclaimed $PUMP token rewards for a pump.fun token.',
                    inputSchema: getRewardsSchema,
                    execute: (input) => methods.pumpfunGetRewards(input),
                },
                {
                    name: 'pumpfun_get_buy_price_impact',
                    description: getBuyPriceImpactSchema.description ?? 'Calculate price impact before buying tokens on pump.fun.',
                    inputSchema: getBuyPriceImpactSchema,
                    execute: (input) => methods.pumpfunGetBuyPriceImpact(input),
                },
                {
                    name: 'pumpfun_get_sell_price_impact',
                    description: getSellPriceImpactSchema.description ?? 'Calculate price impact before selling tokens on pump.fun.',
                    inputSchema: getSellPriceImpactSchema,
                    execute: (input) => methods.pumpfunGetSellPriceImpact(input),
                },
            ];

            return { methods, tools };
        },
    };
}
