import type { WalletPlugin, AgentTool } from '@agentic-wallet/core';
import { AgentWalletError } from '@agentic-wallet/core';
import { PublicKey, VersionedTransaction, Transaction } from '@solana/web3.js';
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import type { SolanaAgentWallet } from '../../wallet';
import { toExplorerTxUrl } from '../../utils';
import type {
    JupiterMethods,
    JupiterPluginConfig,
    JupiterSwapInput,
    JupiterSwapResult,
    JupiterTxResult,
    JupiterGetPriceInput,
    JupiterTokenPrice,
    JupiterSearchTokenInput,
    JupiterGetHoldingsInput,
    JupiterGetShieldInput,
    JupiterCreateLimitOrderInput,
    JupiterCancelLimitOrderInput,
    JupiterGetLimitOrdersInput,
    JupiterCreateRecurringOrderInput,
    JupiterCancelRecurringOrderInput,
    JupiterGetRecurringOrdersInput,
    JupiterLendDepositInput,
    JupiterLendWithdrawInput,
    JupiterLendGetPositionsInput,
    JupiterLendGetEarningsInput,
    JupiterPredictGetEventsInput,
    JupiterPredictGetMarketInput,
    JupiterPredictCreateOrderInput,
    JupiterPredictGetPositionsInput,
    JupiterPredictClosePositionInput,
    JupiterPredictClaimPayoutInput,
    JupiterPredictGetOrderStatusInput,
} from './types';
import {
    swapSchema,
    getPriceSchema,
    searchTokenSchema,
    getHoldingsSchema,
    getShieldSchema,
    createLimitOrderSchema,
    cancelLimitOrderSchema,
    getLimitOrdersSchema,
    createRecurringOrderSchema,
    cancelRecurringOrderSchema,
    getRecurringOrdersSchema,
    lendGetTokensSchema,
    lendDepositSchema,
    lendWithdrawSchema,
    lendGetPositionsSchema,
    lendGetEarningsSchema,
    predictGetEventsSchema,
    predictGetMarketSchema,
    predictCreateOrderSchema,
    predictGetPositionsSchema,
    predictClosePositionSchema,
    predictClaimPayoutSchema,
    predictGetOrderStatusSchema,
} from './schema';

const JUPITER_API_BASE = 'https://api.jup.ag';

//  Internal helpers 

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

function parseUiAmountToRaw(amount: number | string, decimals: number): bigint {
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

//  Plugin factory 

export function jupiterPlugin(
    config?: JupiterPluginConfig,
): WalletPlugin<SolanaAgentWallet, JupiterMethods> {
    return {
        name: 'jupiter',
        register(wallet) {
            const apiBase = config?.apiUrl ?? JUPITER_API_BASE;
            const baseHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
            if (config?.apiKey) baseHeaders['x-api-key'] = config.apiKey;

            //  HTTP helpers 

            async function jupiterFetch(path: string, init?: RequestInit): Promise<unknown> {
                const url = `${apiBase}${path}`;
                const res = await fetch(url, {
                    ...init,
                    headers: { ...baseHeaders, ...(init?.headers as Record<string, string> | undefined) },
                });
                if (!res.ok) {
                    const text = await res.text().catch(() => res.statusText);
                    throw new AgentWalletError('INVALID_ACTION', `Jupiter API error ${res.status}: ${text}`);
                }
                return res.json();
            }

            //  Transaction helpers 

            async function resolveMintDecimals(mintAddress: string): Promise<number> {
                const pubkey = new PublicKey(mintAddress);
                try {
                    const mint = await getMint(wallet.connection, pubkey, 'confirmed', TOKEN_PROGRAM_ID);
                    return mint.decimals;
                } catch {
                    const mint = await getMint(wallet.connection, pubkey, 'confirmed', TOKEN_2022_PROGRAM_ID);
                    return mint.decimals;
                }
            }

            async function resolveRawAmount(
                amount: number | string | undefined,
                amountRaw: string | undefined,
                mintAddress: string,
            ): Promise<string> {
                if (amountRaw) {
                    const normalized = amountRaw.trim();
                    if (!/^\d+$/.test(normalized) || BigInt(normalized) <= 0n) {
                        throw new AgentWalletError('INVALID_ACTION', 'amountRaw must be a positive integer string');
                    }
                    return normalized;
                }
                if (amount !== undefined) {
                    const decimals = await resolveMintDecimals(mintAddress);
                    return parseUiAmountToRaw(amount, decimals).toString();
                }
                throw new AgentWalletError('INVALID_ACTION', 'Either amount or amountRaw is required');
            }

            function deserializeTx(base64: string): VersionedTransaction | Transaction {
                const bytes = Buffer.from(base64, 'base64');
                try {
                    return VersionedTransaction.deserialize(bytes);
                } catch {
                    return Transaction.from(bytes);
                }
            }

            async function signTx(
                tx: VersionedTransaction | Transaction,
            ): Promise<VersionedTransaction | Transaction> {
                if (!wallet.provider.signTransaction) {
                    throw new AgentWalletError(
                        'INVALID_ACTION',
                        'WalletProvider does not support signTransaction',
                    );
                }
                return wallet.provider.signTransaction(tx as VersionedTransaction);
            }

            function serializeTx(tx: VersionedTransaction | Transaction): string {
                return Buffer.from(
                    tx instanceof VersionedTransaction ? tx.serialize() : tx.serialize(),
                ).toString('base64');
            }

            /**
             * Sign a base64 transaction and execute it via a Jupiter /execute endpoint.
             * Used by Trigger and Recurring APIs.
             */
            async function signAndExecuteViaApi(
                txBase64: string,
                requestId: string,
                executeEndpoint: string,
            ): Promise<JupiterTxResult> {
                const tx = deserializeTx(txBase64);
                const signed = await signTx(tx);
                const signedBase64 = serializeTx(signed);

                const result = await jupiterFetch(executeEndpoint, {
                    method: 'POST',
                    body: JSON.stringify({ signedTransaction: signedBase64, requestId }),
                }) as { status?: string; signature?: string; error?: string;[k: string]: unknown };

                if (!result.signature) {
                    throw new AgentWalletError(
                        'INVALID_ACTION',
                        `Execute failed: ${result.error ?? result.status ?? 'no signature returned'}`,
                    );
                }

                return {
                    signature: result.signature,
                    explorerUrl: toExplorerTxUrl(result.signature, wallet.explorerCluster),
                    status: result.status,
                };
            }

            /**
             * Sign a base64 transaction and send directly via the wallet connection.
             * Used by Lend and Prediction APIs that have no backend /execute endpoint.
             */
            async function signAndSendDirectly(txBase64: string): Promise<JupiterTxResult> {
                const tx = deserializeTx(txBase64);
                const signed = await signTx(tx);

                let signature: string;
                if (wallet.provider.signAndSendTransaction) {
                    const result = await wallet.provider.signAndSendTransaction(
                        signed as VersionedTransaction,
                        wallet.connection,
                    );
                    signature = result.signature;
                } else if (signed instanceof VersionedTransaction) {
                    signature = await wallet.connection.sendTransaction(signed);
                } else {
                    signature = await wallet.connection.sendRawTransaction(signed.serialize());
                }

                const latestBlockhash = await wallet.connection.getLatestBlockhash('confirmed');
                await wallet.connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');

                return {
                    signature,
                    explorerUrl: toExplorerTxUrl(signature, wallet.explorerCluster),
                    status: 'Success',
                };
            }

            //  Methods 

            const methods: JupiterMethods = {

                //  Ultra Market Swap 

                async jupiterSwap(input: JupiterSwapInput): Promise<JupiterSwapResult> {
                    const amountRaw = await resolveRawAmount(input.amount, input.amountRaw, input.inputMint);

                    const params = new URLSearchParams({
                        inputMint: input.inputMint,
                        outputMint: input.outputMint,
                        amount: amountRaw,
                        taker: wallet.address,
                    });

                    const orderResponse = await jupiterFetch(`/ultra/v1/order?${params.toString()}`) as {
                        transaction?: string;
                        requestId: string;
                        inAmount: string;
                        outAmount: string;
                        [key: string]: unknown;
                    };

                    if (!orderResponse.transaction) {
                        throw new AgentWalletError(
                            'INVALID_ACTION',
                            'Jupiter Ultra did not return a transaction to sign',
                        );
                    }

                    const txResult = await signAndExecuteViaApi(
                        orderResponse.transaction,
                        orderResponse.requestId,
                        '/ultra/v1/execute',
                    );

                    return {
                        ...txResult,
                        inputMint: input.inputMint,
                        outputMint: input.outputMint,
                        inAmount: orderResponse.inAmount,
                        outAmount: orderResponse.outAmount,
                    };
                },

                //  Price & Discovery 

                async jupiterGetTokenPrice(
                    input: JupiterGetPriceInput,
                ): Promise<Record<string, JupiterTokenPrice | null>> {
                    const ids = input.mints.join(',');
                    const data = await jupiterFetch(`/price/v3?ids=${encodeURIComponent(ids)}`) as Record<
                        string,
                        { usdPrice?: number; decimals?: number; liquidity?: number; priceChange24h?: number } | null
                    >;
                    const result: Record<string, JupiterTokenPrice | null> = {};
                    for (const mint of input.mints) {
                        const entry = data[mint];
                        result[mint] =
                            entry?.usdPrice != null
                                ? {
                                    usdPrice: entry.usdPrice,
                                    decimals: entry.decimals ?? 0,
                                    liquidity: entry.liquidity,
                                    priceChange24h: entry.priceChange24h,
                                }
                                : null;
                    }
                    return result;
                },

                async jupiterSearchToken(input: JupiterSearchTokenInput): Promise<unknown> {
                    const params = new URLSearchParams({ query: input.query });
                    return jupiterFetch(`/ultra/v1/search?${params.toString()}`);
                },

                async jupiterGetHoldings(input: JupiterGetHoldingsInput): Promise<unknown> {
                    const address = input.address ?? wallet.address;
                    return jupiterFetch(`/ultra/v1/holdings/${encodeURIComponent(address)}`);
                },

                async jupiterGetShield(input: JupiterGetShieldInput): Promise<unknown> {
                    const mints = input.mints.join(',');
                    return jupiterFetch(`/ultra/v1/shield?mints=${encodeURIComponent(mints)}`);
                },

                //  Trigger / Limit Orders 

                async jupiterCreateLimitOrder(
                    input: JupiterCreateLimitOrderInput,
                ): Promise<JupiterTxResult> {
                    const maker = wallet.address;
                    const params: Record<string, unknown> = {
                        makingAmount: input.makingAmount,
                        takingAmount: input.takingAmount,
                    };
                    if (input.expiredAt !== undefined) params.expiredAt = String(input.expiredAt);
                    if (input.slippageBps !== undefined) params.slippageBps = String(input.slippageBps);

                    const createResponse = await jupiterFetch('/trigger/v1/createOrder', {
                        method: 'POST',
                        body: JSON.stringify({
                            inputMint: input.inputMint,
                            outputMint: input.outputMint,
                            maker,
                            payer: maker,
                            params,
                            computeUnitPrice: 'auto',
                        }),
                    }) as { transaction: string; requestId: string;[k: string]: unknown };

                    return signAndExecuteViaApi(
                        createResponse.transaction,
                        createResponse.requestId,
                        '/trigger/v1/execute',
                    );
                },

                async jupiterCancelLimitOrder(
                    input: JupiterCancelLimitOrderInput,
                ): Promise<JupiterTxResult> {
                    const cancelResponse = await jupiterFetch('/trigger/v1/cancelOrder', {
                        method: 'POST',
                        body: JSON.stringify({
                            maker: wallet.address,
                            order: input.order,
                            computeUnitPrice: 'auto',
                        }),
                    }) as { transaction: string; requestId: string;[k: string]: unknown };

                    return signAndExecuteViaApi(
                        cancelResponse.transaction,
                        cancelResponse.requestId,
                        '/trigger/v1/execute',
                    );
                },

                async jupiterGetLimitOrders(input: JupiterGetLimitOrdersInput): Promise<unknown> {
                    const params = new URLSearchParams({
                        user: input.address ?? wallet.address,
                        orderStatus: input.orderStatus ?? 'active',
                    });
                    if (input.inputMint) params.set('inputMint', input.inputMint);
                    if (input.outputMint) params.set('outputMint', input.outputMint);
                    if (input.page) params.set('page', String(input.page));
                    return jupiterFetch(`/trigger/v1/getTriggerOrders?${params.toString()}`);
                },

                //  Recurring / DCA 

                async jupiterCreateRecurringOrder(
                    input: JupiterCreateRecurringOrderInput,
                ): Promise<JupiterTxResult> {
                    const createResponse = await jupiterFetch('/recurring/v1/createOrder', {
                        method: 'POST',
                        body: JSON.stringify({
                            user: wallet.address,
                            inputMint: input.inputMint,
                            outputMint: input.outputMint,
                            params: {
                                time: {
                                    inAmount: Number(input.inAmount),
                                    numberOfOrders: input.numberOfOrders,
                                    interval: input.intervalSeconds,
                                    minPrice: input.minPrice ?? null,
                                    maxPrice: input.maxPrice ?? null,
                                    startAt: input.startAt ?? null,
                                },
                            },
                        }),
                    }) as { transaction: string; requestId: string;[k: string]: unknown };

                    return signAndExecuteViaApi(
                        createResponse.transaction,
                        createResponse.requestId,
                        '/recurring/v1/execute',
                    );
                },

                async jupiterCancelRecurringOrder(
                    input: JupiterCancelRecurringOrderInput,
                ): Promise<JupiterTxResult> {
                    const cancelResponse = await jupiterFetch('/recurring/v1/cancelOrder', {
                        method: 'POST',
                        body: JSON.stringify({
                            order: input.order,
                            user: wallet.address,
                            recurringType: 'time',
                        }),
                    }) as { transaction: string; requestId: string;[k: string]: unknown };

                    return signAndExecuteViaApi(
                        cancelResponse.transaction,
                        cancelResponse.requestId,
                        '/recurring/v1/execute',
                    );
                },

                async jupiterGetRecurringOrders(input: JupiterGetRecurringOrdersInput): Promise<unknown> {
                    const params = new URLSearchParams({
                        user: input.address ?? wallet.address,
                        orderStatus: input.orderStatus ?? 'active',
                        recurringType: 'time',
                        includeFailedTx: 'false',
                    });
                    if (input.page) params.set('page', String(input.page));
                    return jupiterFetch(`/recurring/v1/getRecurringOrders?${params.toString()}`);
                },

                //  Lend / Earn 

                async jupiterLendGetTokens(): Promise<unknown> {
                    return jupiterFetch('/lend/v1/earn/tokens');
                },

                async jupiterLendDeposit(input: JupiterLendDepositInput): Promise<JupiterTxResult> {
                    const response = await jupiterFetch('/lend/v1/earn/deposit', {
                        method: 'POST',
                        body: JSON.stringify({
                            asset: input.asset,
                            amount: input.amount,
                            signer: wallet.address,
                        }),
                    }) as { transaction: string;[k: string]: unknown };

                    return signAndSendDirectly(response.transaction);
                },

                async jupiterLendWithdraw(input: JupiterLendWithdrawInput): Promise<JupiterTxResult> {
                    const response = await jupiterFetch('/lend/v1/earn/withdraw', {
                        method: 'POST',
                        body: JSON.stringify({
                            asset: input.asset,
                            amount: input.amount,
                            signer: wallet.address,
                        }),
                    }) as { transaction: string;[k: string]: unknown };

                    return signAndSendDirectly(response.transaction);
                },

                async jupiterLendGetPositions(input: JupiterLendGetPositionsInput): Promise<unknown> {
                    const user = input.address ?? wallet.address;
                    return jupiterFetch(`/lend/v1/earn/positions?users=${encodeURIComponent(user)}`);
                },

                async jupiterLendGetEarnings(input: JupiterLendGetEarningsInput): Promise<unknown> {
                    const user = input.address ?? wallet.address;
                    const params = new URLSearchParams({ user });
                    if (input.positions?.length) params.set('positions', input.positions.join(','));
                    return jupiterFetch(`/lend/v1/earn/earnings?${params.toString()}`);
                },

                //  Prediction Markets 

                async jupiterPredictGetEvents(input: JupiterPredictGetEventsInput): Promise<unknown> {
                    if (input.query) {
                        const params = new URLSearchParams({ query: input.query });
                        return jupiterFetch(`/prediction/v1/events/search?${params.toString()}`);
                    }
                    const params = new URLSearchParams();
                    if (input.category) params.set('category', input.category);
                    if (input.filter) params.set('filter', input.filter);
                    if (input.start !== undefined) params.set('start', String(input.start));
                    if (input.end !== undefined) params.set('end', String(input.end));
                    if (input.includeMarkets !== undefined)
                        params.set('includeMarkets', String(input.includeMarkets));
                    const query = params.toString();
                    return jupiterFetch(`/prediction/v1/events${query ? `?${query}` : ''}`);
                },

                async jupiterPredictGetMarket(input: JupiterPredictGetMarketInput): Promise<unknown> {
                    return jupiterFetch(`/prediction/v1/markets/${encodeURIComponent(input.marketId)}`);
                },

                async jupiterPredictCreateOrder(
                    input: JupiterPredictCreateOrderInput,
                ): Promise<JupiterTxResult> {
                    const body: Record<string, unknown> = {
                        ownerPubkey: wallet.address,
                        marketId: input.marketId,
                        isYes: input.isYes,
                        isBuy: true,
                        depositAmount: input.depositAmount,
                        depositMint:
                            input.depositMint ?? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    };
                    if (input.contracts) body.contracts = input.contracts;

                    const response = await jupiterFetch('/prediction/v1/orders', {
                        method: 'POST',
                        body: JSON.stringify(body),
                    }) as { transaction: string; order?: { pubkey: string };[k: string]: unknown };

                    return signAndSendDirectly(response.transaction);
                },

                async jupiterPredictGetPositions(
                    input: JupiterPredictGetPositionsInput,
                ): Promise<unknown> {
                    const address = input.address ?? wallet.address;
                    return jupiterFetch(
                        `/prediction/v1/positions?ownerPubkey=${encodeURIComponent(address)}`,
                    );
                },

                async jupiterPredictClosePosition(
                    input: JupiterPredictClosePositionInput,
                ): Promise<JupiterTxResult> {
                    const response = await jupiterFetch(
                        `/prediction/v1/positions/${encodeURIComponent(input.positionPubkey)}`,
                        {
                            method: 'DELETE',
                            body: JSON.stringify({ ownerPubkey: wallet.address }),
                        },
                    ) as { transaction: string;[k: string]: unknown };

                    return signAndSendDirectly(response.transaction);
                },

                async jupiterPredictClaimPayout(
                    input: JupiterPredictClaimPayoutInput,
                ): Promise<JupiterTxResult> {
                    const response = await jupiterFetch(
                        `/prediction/v1/positions/${encodeURIComponent(input.positionPubkey)}/claim`,
                        {
                            method: 'POST',
                            body: JSON.stringify({ ownerPubkey: wallet.address }),
                        },
                    ) as { transaction: string;[k: string]: unknown };

                    return signAndSendDirectly(response.transaction);
                },

                async jupiterPredictGetOrderStatus(
                    input: JupiterPredictGetOrderStatusInput,
                ): Promise<unknown> {
                    return jupiterFetch(
                        `/prediction/v1/orders/status/${encodeURIComponent(input.orderPubkey)}`,
                    );
                },
            };

            //  Tool definitions 

            const tools: AgentTool[] = [
                //  Ultra swap 
                {
                    name: 'jupiter_swap',
                    description:
                        'Swap tokens on Solana using Jupiter Ultra (market swap). Best routing, automatic slippage, and fast transaction landing. Provide inputMint and outputMint token addresses and either amount (human-readable e.g. "1.5") or amountRaw (atomic units).',
                    inputSchema: swapSchema,
                    execute: (input) => methods.jupiterSwap(input),
                },

                //  Price & discovery 
                {
                    name: 'jupiter_get_token_price',
                    description:
                        'Get current USD prices for up to 50 token mints. Returns usdPrice, decimals, liquidity, and 24h price change.',
                    inputSchema: getPriceSchema,
                    execute: (input) => methods.jupiterGetTokenPrice(input),
                },
                {
                    name: 'jupiter_search_token',
                    description:
                        'Search for tokens by name, symbol, or mint address. Use this to discover token mint addresses before swapping or trading.',
                    inputSchema: searchTokenSchema,
                    execute: (input) => methods.jupiterSearchToken(input),
                },
                {
                    name: 'jupiter_get_holdings',
                    description:
                        'Get all token holdings (balances) for a wallet — native SOL plus all SPL tokens.',
                    inputSchema: getHoldingsSchema,
                    execute: (input) => methods.jupiterGetHoldings(input),
                },
                {
                    name: 'jupiter_get_shield',
                    description:
                        'Get security and risk warnings for token mints (freeze authority, mint authority, unverified, etc). Always check before trading an unknown token.',
                    inputSchema: getShieldSchema,
                    execute: (input) => methods.jupiterGetShield(input),
                },

                //  Limit Orders 
                {
                    name: 'jupiter_create_limit_order',
                    description:
                        'Create a limit order that executes automatically when the market price reaches your target. Set makingAmount (exact input tokens to sell) and takingAmount (exact output tokens to receive). The ratio defines your limit price.',
                    inputSchema: createLimitOrderSchema,
                    execute: (input) => methods.jupiterCreateLimitOrder(input),
                },
                {
                    name: 'jupiter_cancel_limit_order',
                    description:
                        'Cancel an open limit order and return unfilled tokens to the wallet. Retrieve the order account pubkey using jupiter_get_limit_orders.',
                    inputSchema: cancelLimitOrderSchema,
                    execute: (input) => methods.jupiterCancelLimitOrder(input),
                },
                {
                    name: 'jupiter_get_limit_orders',
                    description:
                        'Get active or historical limit orders for a wallet. Filter by status, input/output token.',
                    inputSchema: getLimitOrdersSchema,
                    execute: (input) => methods.jupiterGetLimitOrders(input),
                },

                //  Recurring / DCA 
                {
                    name: 'jupiter_create_recurring_order',
                    description:
                        'Create a Dollar Cost Averaging (DCA) order that automatically buys tokens at regular intervals. Great for accumulating tokens over time. Set inAmount (total to spend), numberOfOrders (how many buys), and intervalSeconds (e.g. 86400 = daily).',
                    inputSchema: createRecurringOrderSchema,
                    execute: (input) => methods.jupiterCreateRecurringOrder(input),
                },
                {
                    name: 'jupiter_cancel_recurring_order',
                    description:
                        'Cancel an active recurring/DCA order and reclaim remaining funds. Retrieve order pubkey using jupiter_get_recurring_orders.',
                    inputSchema: cancelRecurringOrderSchema,
                    execute: (input) => methods.jupiterCancelRecurringOrder(input),
                },
                {
                    name: 'jupiter_get_recurring_orders',
                    description:
                        'Get active or historical recurring/DCA orders for a wallet.',
                    inputSchema: getRecurringOrdersSchema,
                    execute: (input) => methods.jupiterGetRecurringOrders(input),
                },

                //  Lend / Earn 
                {
                    name: 'jupiter_lend_get_tokens',
                    description:
                        'Get all tokens available to deposit on Jupiter Lend, including current APY rates, total supply, and liquidity info.',
                    inputSchema: lendGetTokensSchema,
                    execute: () => methods.jupiterLendGetTokens(),
                },
                {
                    name: 'jupiter_lend_deposit',
                    description:
                        'Deposit tokens into Jupiter Lend to earn yield. No fees, no deposit limits. Use jupiter_lend_get_tokens to find available tokens and their mint addresses.',
                    inputSchema: lendDepositSchema,
                    execute: (input) => methods.jupiterLendDeposit(input),
                },
                {
                    name: 'jupiter_lend_withdraw',
                    description:
                        'Withdraw deposited tokens from Jupiter Lend. Pass the "shares" value (jlToken balance) from jupiter_lend_get_positions as the amount — NOT underlying token units. Subject to debt ceiling limits.',
                    inputSchema: lendWithdrawSchema,
                    execute: (input) => methods.jupiterLendWithdraw(input),
                },
                {
                    name: 'jupiter_lend_get_positions',
                    description:
                        'Get current lending positions for a wallet — shows deposited assets, shares held, and underlying balance.',
                    inputSchema: lendGetPositionsSchema,
                    execute: (input) => methods.jupiterLendGetPositions(input),
                },
                {
                    name: 'jupiter_lend_get_earnings',
                    description:
                        'Get accumulated earnings/rewards for lending positions.',
                    inputSchema: lendGetEarningsSchema,
                    execute: (input) => methods.jupiterLendGetEarnings(input),
                },

                //  Prediction Markets 
                {
                    name: 'jupiter_predict_get_events',
                    description:
                        'Browse or search prediction market events across categories: crypto, sports, politics, esports, culture, economics, tech. Use query for keyword search or category/filter to browse.',
                    inputSchema: predictGetEventsSchema,
                    execute: (input) => methods.jupiterPredictGetEvents(input),
                },
                {
                    name: 'jupiter_predict_get_market',
                    description:
                        'Get detailed info for a specific prediction market: current YES/NO prices (probability), volume, liquidity, open interest, and status.',
                    inputSchema: predictGetMarketSchema,
                    execute: (input) => methods.jupiterPredictGetMarket(input),
                },
                {
                    name: 'jupiter_predict_create_order',
                    description:
                        'Open a YES or NO position in a prediction market. Prices range from 0–$1 per contract — a 70¢ YES price implies 70% probability. Each winning contract pays out $1.00.',
                    inputSchema: predictCreateOrderSchema,
                    execute: (input) => methods.jupiterPredictCreateOrder(input),
                },
                {
                    name: 'jupiter_predict_get_positions',
                    description:
                        'Get all open prediction market positions for a wallet — contracts held, cost basis, current value, unrealized P&L, and claimable status.',
                    inputSchema: predictGetPositionsSchema,
                    execute: (input) => methods.jupiterPredictGetPositions(input),
                },
                {
                    name: 'jupiter_predict_close_position',
                    description:
                        'Close (sell) an entire prediction market position before settlement. Returns proceeds to the wallet.',
                    inputSchema: predictClosePositionSchema,
                    execute: (input) => methods.jupiterPredictClosePosition(input),
                },
                {
                    name: 'jupiter_predict_claim_payout',
                    description:
                        'Claim payout from a resolved prediction market where your side won. Each winning contract pays $1.00 with no fees.',
                    inputSchema: predictClaimPayoutSchema,
                    execute: (input) => methods.jupiterPredictClaimPayout(input),
                },
                {
                    name: 'jupiter_predict_get_order_status',
                    description:
                        'Check the fill status of a prediction market order (pending, filled, or failed). Poll this after creating an order to confirm execution.',
                    inputSchema: predictGetOrderStatusSchema,
                    execute: (input) => methods.jupiterPredictGetOrderStatus(input),
                },
            ];

            return { methods, tools };
        },
    };
}



