//  Config 

export interface JupiterPluginConfig {
    /** Optional Jupiter API key sent as x-api-key header. */
    apiKey?: string;
    /** Optional API base URL override. Defaults to https://api.jup.ag */
    apiUrl?: string;
}

//  Shared 

/** Result returned after a transaction is signed and confirmed on-chain. */
export interface JupiterTxResult {
    signature: string;
    explorerUrl: string;
    status?: string;
}

//  Ultra Swap 

export interface JupiterSwapInput {
    inputMint: string;
    outputMint: string;
    /** Human-readable token amount (e.g. "1.5"). Provide either amount or amountRaw. */
    amount?: number | string;
    /** Raw atomic units (integer string). Provide either amount or amountRaw. */
    amountRaw?: string;
}

export interface JupiterSwapResult extends JupiterTxResult {
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
}

//  Price & Discovery 

export interface JupiterGetPriceInput {
    /** Token mint addresses. Max 50. */
    mints: string[];
}

export interface JupiterTokenPrice {
    usdPrice: number;
    decimals: number;
    liquidity?: number;
    priceChange24h?: number;
}

export interface JupiterSearchTokenInput {
    /** Token name, symbol, or mint address. */
    query: string;
}

export interface JupiterGetHoldingsInput {
    /** Wallet address to query. Defaults to current wallet. */
    address?: string;
}

export interface JupiterGetShieldInput {
    /** Mint addresses to check for security warnings. */
    mints: string[];
}

//  Trigger / Limit Orders 

export interface JupiterCreateLimitOrderInput {
    inputMint: string;
    outputMint: string;
    /** Raw atomic units of input token to sell (integer string). */
    makingAmount: string;
    /** Raw atomic units of output token to receive (integer string). Sets the limit price. */
    takingAmount: string;
    /** Order expiry as a Unix timestamp (seconds). Omit for no expiry. */
    expiredAt?: number;
    /** Slippage in basis points. Omit for Exact mode (0 slippage). */
    slippageBps?: number;
}

export interface JupiterCancelLimitOrderInput {
    /** Order account public key to cancel. */
    order: string;
}

export interface JupiterGetLimitOrdersInput {
    /** Wallet address. Defaults to the current connected wallet. */
    address?: string;
    /** Filter by order status. Defaults to "active". */
    orderStatus?: 'active' | 'history';
    /** Filter by input token mint. */
    inputMint?: string;
    /** Filter by output token mint. */
    outputMint?: string;
    /** Page number (1-based). */
    page?: number;
}

//  Recurring / DCA 

export interface JupiterCreateRecurringOrderInput {
    inputMint: string;
    outputMint: string;
    /**
     * Total raw amount of input token to deposit (atomic units, integer string).
     * Will be split evenly across numberOfOrders. Minimum total ≈ 100 USD.
     */
    inAmount: string;
    /** Total number of orders to execute. Minimum 2. */
    numberOfOrders: number;
    /** Interval between orders in seconds (e.g. 86400 = daily). */
    intervalSeconds: number;
    /** Minimum acceptable price. Null for no minimum. */
    minPrice?: number | null;
    /** Maximum acceptable price. Null for no maximum. */
    maxPrice?: number | null;
    /** Unix timestamp to start the first order. Null = start immediately. */
    startAt?: number | null;
}

export interface JupiterCancelRecurringOrderInput {
    /** Order account public key to cancel. */
    order: string;
}

export interface JupiterGetRecurringOrdersInput {
    /** Wallet address. Defaults to the current wallet. */
    address?: string;
    /** Filter by order status. Defaults to "active". */
    orderStatus?: 'active' | 'history';
    /** Page number (1-based). */
    page?: number;
}

//  Lend / Earn 

export interface JupiterLendDepositInput {
    /** Underlying token mint address (e.g. USDC, SOL). */
    asset: string;
    /** Raw atomic units to deposit (integer string). */
    amount: string;
}

export interface JupiterLendWithdrawInput {
    /** Underlying token mint address. */
    asset: string;
    /** Raw atomic units to withdraw (integer string). */
    amount: string;
}

export interface JupiterLendGetPositionsInput {
    /** Wallet address to query. Defaults to the current wallet. */
    address?: string;
}

export interface JupiterLendGetEarningsInput {
    /** Wallet address to query. Defaults to the current wallet. */
    address?: string;
    /** Optional specific position public keys to query. */
    positions?: string[];
}

//  Prediction Markets 

export type JupiterPredictCategory =
    | 'crypto'
    | 'sports'
    | 'politics'
    | 'esports'
    | 'culture'
    | 'economics'
    | 'tech';

export interface JupiterPredictGetEventsInput {
    /** Filter events by category. */
    category?: JupiterPredictCategory;
    /** Filter by status: new, live, or trending. */
    filter?: 'new' | 'live' | 'trending';
    /** Search events by keyword. Triggers a search instead of list. */
    query?: string;
    /** Pagination start index. */
    start?: number;
    /** Pagination end index. */
    end?: number;
    /** Include nested markets in response. */
    includeMarkets?: boolean;
}

export interface JupiterPredictGetMarketInput {
    /** Market public key (PDA). */
    marketId: string;
}

export interface JupiterPredictCreateOrderInput {
    /** Market public key to trade on. */
    marketId: string;
    /** true = buy YES contracts, false = buy NO contracts. */
    isYes: boolean;
    /**
     * Amount to deposit in raw atomic units (e.g. 2000000 = 2 USDC).
     * Each contract pays $1 if the outcome is correct.
     */
    depositAmount: string;
    /**
     * Deposit token mint. Use JupUSD (JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD)
     * or USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v). Defaults to USDC.
     */
    depositMint?: string;
    /** Optional specific number of contracts to purchase. */
    contracts?: string;
}

export interface JupiterPredictGetPositionsInput {
    /** Wallet address. Defaults to the current wallet. */
    address?: string;
}

export interface JupiterPredictClosePositionInput {
    /** Position account public key. */
    positionPubkey: string;
}

export interface JupiterPredictClaimPayoutInput {
    /** Position account public key of a resolved winning position. */
    positionPubkey: string;
}

export interface JupiterPredictGetOrderStatusInput {
    /** Order account public key. */
    orderPubkey: string;
}

//  Methods registry 

export type JupiterMethods = {
    // Ultra swap (market)
    jupiterSwap(input: JupiterSwapInput): Promise<JupiterSwapResult>;

    // Price & discovery
    jupiterGetTokenPrice(input: JupiterGetPriceInput): Promise<Record<string, JupiterTokenPrice | null>>;
    jupiterSearchToken(input: JupiterSearchTokenInput): Promise<unknown>;
    jupiterGetHoldings(input: JupiterGetHoldingsInput): Promise<unknown>;
    jupiterGetShield(input: JupiterGetShieldInput): Promise<unknown>;

    // Trigger / Limit orders
    jupiterCreateLimitOrder(input: JupiterCreateLimitOrderInput): Promise<JupiterTxResult>;
    jupiterCancelLimitOrder(input: JupiterCancelLimitOrderInput): Promise<JupiterTxResult>;
    jupiterGetLimitOrders(input: JupiterGetLimitOrdersInput): Promise<unknown>;

    // Recurring / DCA
    jupiterCreateRecurringOrder(input: JupiterCreateRecurringOrderInput): Promise<JupiterTxResult>;
    jupiterCancelRecurringOrder(input: JupiterCancelRecurringOrderInput): Promise<JupiterTxResult>;
    jupiterGetRecurringOrders(input: JupiterGetRecurringOrdersInput): Promise<unknown>;

    // Lend / Earn
    jupiterLendGetTokens(): Promise<unknown>;
    jupiterLendDeposit(input: JupiterLendDepositInput): Promise<JupiterTxResult>;
    jupiterLendWithdraw(input: JupiterLendWithdrawInput): Promise<JupiterTxResult>;
    jupiterLendGetPositions(input: JupiterLendGetPositionsInput): Promise<unknown>;
    jupiterLendGetEarnings(input: JupiterLendGetEarningsInput): Promise<unknown>;

    // Prediction markets
    jupiterPredictGetEvents(input: JupiterPredictGetEventsInput): Promise<unknown>;
    jupiterPredictGetMarket(input: JupiterPredictGetMarketInput): Promise<unknown>;
    jupiterPredictCreateOrder(input: JupiterPredictCreateOrderInput): Promise<JupiterTxResult>;
    jupiterPredictGetPositions(input: JupiterPredictGetPositionsInput): Promise<unknown>;
    jupiterPredictClosePosition(input: JupiterPredictClosePositionInput): Promise<JupiterTxResult>;
    jupiterPredictClaimPayout(input: JupiterPredictClaimPayoutInput): Promise<JupiterTxResult>;
    jupiterPredictGetOrderStatus(input: JupiterPredictGetOrderStatusInput): Promise<unknown>;
};
