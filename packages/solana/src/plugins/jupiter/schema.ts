import { z } from 'zod';

//  Shared 

export const rawAmountSchema = z
    .string()
    .regex(/^\d+$/, 'Must be a positive integer in base units')
    .describe('Raw atomic units (integer string, e.g. lamports for SOL)');

export const amountSchema = z
    .union([z.number().positive(), z.string().min(1)])
    .describe('Human-readable token amount (e.g. "1.5")');

const mintAddressSchema = z.string().min(32).describe('Token mint address (base58)');
const pubkeySchema = z.string().min(32).describe('Account public key (base58)');

//  Ultra Swap 

export const swapSchema = z
    .object({
        inputMint: mintAddressSchema.describe('Input token mint address'),
        outputMint: mintAddressSchema.describe('Output token mint address'),
        amount: amountSchema.optional().describe('Human-readable input amount (e.g. "1.5"). Provide either this or amountRaw.'),
        amountRaw: rawAmountSchema.optional().describe('Raw atomic units. Provide either this or amount.'),
    })
    .describe(
        'Swap tokens using Jupiter Ultra. Handles routing, slippage, and transaction landing automatically. Use jupiter_get_token_price or jupiter_search_token first if you do not know the mint addresses.',
    );

//  Price & Discovery 

export const getPriceSchema = z
    .object({
        mints: z.array(mintAddressSchema).min(1).max(50).describe('Token mint addresses to fetch USD prices for (max 50)'),
    })
    .describe('Get current USD prices for up to 50 token mints using Jupiter Price API V3.');

export const searchTokenSchema = z
    .object({
        query: z.string().min(1).describe('Token name, symbol, or mint address to search for'),
    })
    .describe('Search for tokens by name, symbol, or mint address. Returns token metadata and mint addresses.');

export const getHoldingsSchema = z
    .object({
        address: pubkeySchema
            .optional()
            .describe('Wallet address to query. Defaults to the current connected wallet.'),
    })
    .describe('Get all token holdings (balances) for a wallet including native SOL and all SPL tokens.');

export const getShieldSchema = z
    .object({
        mints: z.array(mintAddressSchema).min(1).describe('Token mint addresses to check for security warnings.'),
    })
    .describe(
        'Get security and risk warnings for token mints (freeze authority, mint authority, unverified status, etc). Always check before trading an unknown token.',
    );

//  Trigger / Limit Orders 

export const createLimitOrderSchema = z
    .object({
        inputMint: mintAddressSchema.describe('Token to sell — input mint address'),
        outputMint: mintAddressSchema.describe('Token to receive — output mint address'),
        makingAmount: rawAmountSchema.describe(
            'Raw atomic units of the input token to sell. This sets HOW MUCH you are selling.',
        ),
        takingAmount: rawAmountSchema.describe(
            'Raw atomic units of the output token to receive. Together with makingAmount this defines the limit price (price = takingAmount / makingAmount in output decimals per input decimals).',
        ),
        expiredAt: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Order expiry as Unix timestamp in seconds. Omit for no expiry.'),
        slippageBps: z
            .number()
            .int()
            .min(0)
            .max(5000)
            .optional()
            .describe('Slippage in basis points for filling. Omit for Exact mode (0 slippage, recommended for limit orders).'),
    })
    .describe(
        'Create a limit order that executes automatically when the market price reaches your target. Use makingAmount (input) and takingAmount (output) to set the exact price.',
    );

export const cancelLimitOrderSchema = z
    .object({
        order: pubkeySchema.describe('Order account public key to cancel. Retrieve via jupiter_get_limit_orders.'),
    })
    .describe('Cancel an open limit order and return unfilled tokens to the wallet.');

export const getLimitOrdersSchema = z
    .object({
        address: pubkeySchema.optional().describe('Wallet address. Defaults to the current wallet.'),
        orderStatus: z
            .enum(['active', 'history'])
            .optional()
            .describe('Filter by status. "active" = open orders, "history" = filled/cancelled. Defaults to "active".'),
        inputMint: mintAddressSchema.optional().describe('Filter by input token mint.'),
        outputMint: mintAddressSchema.optional().describe('Filter by output token mint.'),
        page: z.number().int().positive().optional().describe('Page number (10 orders per page).'),
    })
    .describe('Get active or historical limit orders for a wallet.');

//  Recurring / DCA 

export const createRecurringOrderSchema = z
    .object({
        inputMint: mintAddressSchema.describe('Token to spend — input mint address'),
        outputMint: mintAddressSchema.describe('Token to accumulate — output mint address'),
        inAmount: rawAmountSchema.describe(
            'Total raw atomic units of input token to deposit. Divided evenly across numberOfOrders. Minimum ~100 USD total.',
        ),
        numberOfOrders: z
            .number()
            .int()
            .min(2)
            .describe('Total number of orders to execute. Minimum 2. Amount per order = inAmount / numberOfOrders.'),
        intervalSeconds: z
            .number()
            .int()
            .positive()
            .describe(
                'Seconds between each order execution. Common values: 3600 (hourly), 86400 (daily), 604800 (weekly).',
            ),
        minPrice: z.number().positive().nullable().optional().describe('Minimum token price to execute at. Null = no minimum.'),
        maxPrice: z.number().positive().nullable().optional().describe('Maximum token price to execute at. Null = no maximum.'),
        startAt: z
            .number()
            .int()
            .positive()
            .nullable()
            .optional()
            .describe('Unix timestamp for first order. Null = start immediately.'),
    })
    .describe(
        'Create a recurring Dollar Cost Averaging (DCA) order. Automatically buys outputMint at regular intervals using inputMint. Great for accumulating tokens over time without timing the market.',
    );

export const cancelRecurringOrderSchema = z
    .object({
        order: pubkeySchema.describe('Order account public key to cancel. Retrieve via jupiter_get_recurring_orders.'),
    })
    .describe('Cancel an active recurring/DCA order and return remaining funds to the wallet.');

export const getRecurringOrdersSchema = z
    .object({
        address: pubkeySchema.optional().describe('Wallet address. Defaults to the current wallet.'),
        orderStatus: z
            .enum(['active', 'history'])
            .optional()
            .describe('Filter by status. Defaults to "active".'),
        page: z.number().int().positive().optional().describe('Page number (10 orders per page).'),
    })
    .describe('Get active or historical recurring/DCA orders for a wallet.');

//  Lend / Earn 

export const lendGetTokensSchema = z
    .object({})
    .describe(
        'Get all tokens available for lending/depositing on Jupiter Lend, including current APY rates, supply, and liquidity.',
    );

export const lendDepositSchema = z
    .object({
        asset: mintAddressSchema.describe('Underlying token mint address to deposit (e.g. USDC, SOL).'),
        amount: rawAmountSchema.describe('Raw atomic units to deposit. Use jupiter_lend_get_tokens to find available tokens.'),
    })
    .describe('Deposit tokens into Jupiter Lend to earn yield. No fees, no minimum deposit.');

export const lendWithdrawSchema = z
    .object({
        asset: mintAddressSchema.describe('Underlying token mint address to withdraw (e.g. USDC mint).'),
        amount: rawAmountSchema.describe(
            'Amount in jlToken shares to burn (NOT underlying token units). Get the shares value from the "shares" field in jupiter_lend_get_positions.',
        ),
    })
    .describe(
        'Withdraw deposited tokens from Jupiter Lend. Pass the "shares" value from jupiter_lend_get_positions as the amount. Subject to automated debt ceiling limits.',
    );

export const lendGetPositionsSchema = z
    .object({
        address: pubkeySchema.optional().describe('Wallet address. Defaults to the current wallet.'),
    })
    .describe('Get lending positions for a wallet, including shares, underlying assets, and balance.');

export const lendGetEarningsSchema = z
    .object({
        address: pubkeySchema.optional().describe('Wallet address. Defaults to the current wallet.'),
        positions: z
            .array(pubkeySchema)
            .optional()
            .describe('Specific position public keys to query. Omit to get all positions for the wallet.'),
    })
    .describe('Get earnings/rewards accumulated for lending positions.');

//  Prediction Markets 

export const predictGetEventsSchema = z
    .object({
        category: z
            .enum(['crypto', 'sports', 'politics', 'esports', 'culture', 'economics', 'tech'])
            .optional()
            .describe('Filter events by category.'),
        filter: z
            .enum(['new', 'live', 'trending'])
            .optional()
            .describe('Filter by event status/activity.'),
        query: z
            .string()
            .optional()
            .describe(
                'Search events by keyword (title, topic). When provided, performs a search instead of listing.',
            ),
        start: z.number().int().min(0).optional().describe('Pagination start index.'),
        end: z.number().int().positive().optional().describe('Pagination end index.'),
        includeMarkets: z.boolean().optional().describe('Include nested market data in response.'),
    })
    .describe(
        'Discover prediction market events. Browse by category (crypto, sports, politics, etc.) or search by keyword. Returns events with their markets and pricing.',
    );

const marketIdSchema = z.string().min(1).describe('Market ID (e.g. POLY-1234567 or base58 pubkey). Retrieve from jupiter_predict_get_events.');

export const predictGetMarketSchema = z
    .object({
        marketId: marketIdSchema,
    })
    .describe(
        'Get detailed information for a specific prediction market including current YES/NO prices, volume, liquidity, and status.',
    );

export const predictCreateOrderSchema = z
    .object({
        marketId: marketIdSchema.describe('Market ID to trade on. Must be in "open" status.'),
        isYes: z.boolean().describe('true = buy YES contracts (you think it will happen), false = buy NO contracts.'),
        depositAmount: rawAmountSchema.describe(
            'Amount to deposit in raw atomic units. For USDC (6 decimals): 2000000 = 2 USDC. Each winning contract pays $1.',
        ),
        depositMint: mintAddressSchema
            .optional()
            .describe(
                'Token to deposit. Use USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v) or JupUSD (JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD). Defaults to USDC.',
            ),
        contracts: z
            .string()
            .optional()
            .describe('Specific number of contracts to purchase (as a string integer). Omit to let the API calculate.'),
    })
    .describe(
        'Open a YES or NO position in a prediction market. Place a buy order — the keeper network fills it and you get contracts. Check order status with jupiter_predict_get_order_status.',
    );

export const predictGetPositionsSchema = z
    .object({
        address: pubkeySchema.optional().describe('Wallet address. Defaults to the current wallet.'),
    })
    .describe(
        'Get all open prediction market positions for a wallet including contracts held, cost basis, current value, P&L, and claimable status.',
    );

export const predictClosePositionSchema = z
    .object({
        positionPubkey: pubkeySchema.describe(
            'Position account public key. Retrieve from jupiter_predict_get_positions.',
        ),
    })
    .describe('Close (sell) an entire prediction market position. Returns proceeds to the wallet.');

export const predictClaimPayoutSchema = z
    .object({
        positionPubkey: pubkeySchema.describe(
            'Position public key of a resolved winning position. Each winning contract pays $1.',
        ),
    })
    .describe('Claim winnings from a resolved prediction market where your side won. No fees on payouts.');

export const predictGetOrderStatusSchema = z
    .object({
        orderPubkey: pubkeySchema.describe('Order account public key to check.'),
    })
    .describe(
        'Check the fill status of a prediction market order (pending, filled, or failed). Poll after creating an order to confirm execution.',
    );

