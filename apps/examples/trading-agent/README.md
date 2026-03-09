# Autonomous Trading Agent v2.0

An **elite autonomous trading agent** that hunts for DeFi opportunities 24/7 using TanStack AI + OpenRouter + Jupiter. Built for production with risk management, performance tracking, and circuit breakers.

## 🚀 Key Features

### Autonomous Trading
- **24/7 Operation** - Runs continuously, scanning markets every 5 minutes
- **AI-Powered Decisions** - Uses TanStack AI with OpenRouter (Claude, GPT, etc.)
- **Automatic Execution** - AI decides when to scan, analyze, and trade
- **Multi-Strategy** - Adapts to market conditions automatically

### Risk Management (Production-Ready)
- **Circuit Breakers** - Stops trading if daily loss limit hit
- **Position Sizing** - Max 30% concentration in any token
- **Stop Losses** - Automatic 5% stop loss on all positions
- **Take Profits** - 10% profit targets
- **Liquidity Checks** - Only trades tokens with $100k+ liquidity
- **Security Scans** - Verifies tokens before trading

### Performance Tracking
- **Win Rate Monitoring** - Tracks success rate of trades
- **P&L Tracking** - Real-time profit/loss calculations
- **Max Drawdown** - Monitors portfolio drawdown
- **Daily Limits** - Configurable daily loss limits

### Safety Features
- **Dry Run Mode** - Test strategies without executing trades
- **Pause/Resume** - Manual control to stop/start trading
- **Session Stats** - Detailed performance metrics

## 📦 Setup

```bash
cd apps/trading-agent
bun install
```

## ⚙️ Configuration

Create a `.env` file:

```bash
# Required
SOLANA_PRIVATE_KEY=your_base58_private_key
SOLANA_RPC_URL=https://api.devnet.solana.com
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional - Risk Management
MAX_TRADE_SIZE_USD=100          # Max $ per trade
MAX_DAILY_LOSS_USD=50           # Stop if lose $50/day
MAX_POSITION_CONCENTRATION=0.3  # Max 30% in one token
STOP_LOSS_PERCENT=5             # 5% stop loss
TAKE_PROFIT_PERCENT=10          # 10% take profit
MIN_LIQUIDITY_USD=100000        # Min $100k liquidity

# Optional - Agent Settings
OPENROUTER_MODEL=openai/gpt-4o  # or anthropic/claude-3.5-sonnet
MAX_CYCLES=0                     # 0 = infinite
CYCLE_INTERVAL_MS=300000         # 5 minutes
```

## 🎯 Usage

### Live Trading

```bash
bun run src/index.ts
```

### Dry Run (Test Mode)

```ts
import { createTradingWallet } from './wallet.js';
import { createAutonomousTradingAgent } from './agent.js';

const wallet = createTradingWallet();
const agent = createAutonomousTradingAgent({ 
    wallet,
    dryRun: true,  // No real trades!
    riskConfig: {
        maxTradeSizeUSD: 50,
        maxDailyLossUSD: 25,
    }
});

await agent.start();
```

### With Custom Risk Settings

```ts
const agent = createAutonomousTradingAgent({ 
    wallet,
    model: "anthropic/claude-3.5-sonnet",
    cycleIntervalMs: 600000,  // 10 minutes
    riskConfig: {
        maxTradeSizeUSD: 200,
        maxPositionConcentration: 0.25,
        stopLossPercent: 3,
        takeProfitPercent: 15,
    }
});
```

## 🤖 How It Works

### Trading Loop

1. **Portfolio Analysis** - AI checks current holdings and allocations
2. **Market Scan** - Searches for high-potential opportunities
3. **Risk Assessment** - Verifies liquidity, security, volatility
4. **Strategy Selection** - Chooses best approach (swap, limit order, DCA)
5. **Execution** - Enters positions with proper sizing
6. **Monitoring** - Tracks P&L and adjusts
7. **Rebalancing** - Maintains optimal portfolio mix

### Decision Flow

```
┌┐
│  1. SCAN MARKET                          │
│     - Get portfolio holdings             │
│     - Check token prices                 │
│     - Identify opportunities             │
└┬┘
               │
┌▼┐
│  2. ANALYZE                              │
│     - Technical analysis                 │
│     - Risk assessment                    │
│     - Opportunity scoring                │
└┬┘
               │
┌▼┐
│  3. DECIDE                               │
│     - Buy/Sell/Hold                      │
│     - Position sizing                    │
│     - Entry/Exit strategy                │
└┬┘
               │
┌▼┐
│  4. EXECUTE                              │
│     - Verify security (jupiter_get_shield)
│     - Check liquidity                    │
│     - Submit transaction                 │
└┬┘
               │
┌▼┐
│  5. MONITOR                              │
│     - Track P&L                          │
│     - Check stop losses                  │
│     - Rebalance if needed                │
└┘
```

## 📊 Performance Metrics

The agent tracks:

- **Win Rate** - % of profitable trades
- **Total P&L** - Cumulative profit/loss
- **Average Return** - Per-trade performance
- **Max Drawdown** - Peak-to-trough decline
- **Daily P&L** - Profit/loss per day

```
🚀 AUTONOMOUS TRADING AGENT v2.0

⚙️ Configuration:
   Model: openai/gpt-4o
   Wallet: 7x...9z
   Cycle: 300s
   Mode: Infinite
   Risk: Max $100/trade, 5% SL, 10% TP
   Dry Run: NO (LIVE TRADING)

💰 Starting trading session...

🔄 [Cycle #1] 14:32:15
   Analyzing market opportunities...
   [AI analyzes portfolio, scans market...]
   BUY SOL $50 [executed: 0.3 SOL @ $166.50]
   ✅ Cycle complete | Win Rate: 0.0% | P&L: $0.00

⏳ Next cycle in 300s...

🔄 [Cycle #2] 14:37:15
   Analyzing market opportunities...
   HOLD [Portfolio up 2.3%, no action needed]
   ✅ Cycle complete | Win Rate: 0.0% | P&L: +$1.15
```

## 🛡️ Safety Features

### Circuit Breakers
- Daily loss limit reached → **Auto-pause**
- Max drawdown exceeded → **Auto-pause**
- Suspicious token detected → **Skip trade**

### Position Limits
- Never exceed max position concentration
- Never trade more than max trade size
- Only trade tokens with sufficient liquidity

### Dry Run Mode
Test strategies without risking funds:

```ts
const agent = createAutonomousTradingAgent({ 
    wallet,
    dryRun: true,
});
// AI analyzes and decides, but no trades execute
```

## 🎛️ Controls

```ts
// Pause trading manually
agent.pause();

// Resume trading
agent.resume();

// Run single cycle
await agent.runOnce();

// Get current stats
const stats = agent.getStats();
console.log(stats);
// {
//   cyclesCompleted: 42,
//   address: "7x...9z",
//   totalTrades: 15,
//   winningTrades: 9,
//   losingTrades: 6,
//   totalPnlUSD: 127.50,
//   winRate: 0.6,
//   avgReturn: 8.50,
//   maxDrawdown: 0.03,
//   isPaused: false
// }
```

## 🔧 Available Tools

The AI has access to all Jupiter tools:

- `jupiter_swap` - Execute swaps
- `jupiter_get_token_price` - Real-time prices
- `jupiter_search_token` - Find tokens
- `jupiter_get_holdings` - Portfolio check
- `jupiter_create_limit_order` - Automated orders
- `jupiter_create_recurring_order` - DCA strategies
- `jupiter_lend_deposit` - Yield farming
- `jupiter_get_shield` - Security verification

## ⚠️ Risk Warning

**Start with dry run mode!**

```ts
dryRun: true  // Test first
```

**Then start small:**

```ts
riskConfig: {
    maxTradeSizeUSD: 10,      // Start with $10
    maxDailyLossUSD: 25,      // Stop if lose $25
}
```

**Monitor closely before scaling up.**

## 📝 Best Practices

1. **Test on devnet** first with small amounts
2. **Use dry run mode** to validate strategies
3. **Set conservative limits** initially
4. **Monitor daily** until confident
5. **Adjust risk** based on performance
6. **Keep SOL for gas** (0.5+ SOL recommended)

## 🔗 Links

- OpenRouter: https://openrouter.ai/
- Jupiter: https://jup.ag/
- TanStack AI: https://tanstack.com/ai

## License

MIT
