import { createFileRoute, Link } from '@tanstack/react-router';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';
import { useState } from 'react';

export const Route = createFileRoute('/')({
  component: Home,
});

const chains = [
  { name: 'Solana', color: '#9945FF', status: 'live' },
  { name: 'Ethereum', color: '#627EEA', status: 'coming' },
  { name: 'Polygon', color: '#8247E5', status: 'coming' },
  { name: 'Base', color: '#0052FF', status: 'coming' },
];

const pluginsByChain: Record<string, Array<{ name: string; desc: string }>> = {
  Solana: [
    { name: 'Jupiter', desc: 'Swaps, limit orders, DCA' },
    { name: 'Pump.fun', desc: 'Token creation, bonding curves' },
    { name: 'Raydium', desc: 'Liquidity pools, farming' },
    { name: 'SNS', desc: 'Domain names (.sol)' },
  ],
  Ethereum: [],
  Polygon: [],
  Base: [],
};

function ChainSelector({ selected, onSelect }: { selected: string; onSelect: (chain: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {chains.map((chain) => (
        <button
          type="button"
          key={chain.name}
          onClick={() => onSelect(chain.name)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            selected === chain.name
              ? 'bg-fd-primary text-fd-primary-foreground'
              : 'border border-fd-border bg-fd-card text-fd-muted-foreground hover:text-fd-foreground'
          }`}
        >
          {chain.name}
        </button>
      ))}
    </div>
  );
}

function Home() {
  const [selectedChain, setSelectedChain] = useState('Solana');
  const currentPlugins = pluginsByChain[selectedChain] || [];

  return (
    <HomeLayout {...baseOptions()}>
      <main className="w-full">
        {/* Hero */}
        <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-4 py-20 text-center">
          <p className="text-xs font-medium tracking-[0.12em] text-fd-muted-foreground uppercase">
            Solana · Ethereum · Polygon · Base
          </p>
          
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-fd-foreground sm:text-6xl">
            Wallet Tools for
            <br />
            <span className="text-fd-primary">AI Agents</span>
          </h1>
          
          <p className="mt-6 max-w-xl text-lg text-fd-muted-foreground">
            Give AI agents wallets. They can trade tokens, manage portfolios, 
            and interact with DeFi protocols — all with self-custody.
          </p>

          <div className="mt-8 flex gap-3">
            <Link
              to="/docs/$"
              params={{ _splat: 'getting-started/installation' }}
              className="rounded-md bg-fd-primary px-6 py-3 text-sm font-medium text-fd-primary-foreground transition hover:opacity-90"
            >
              Get Started
            </Link>
            <a
              href="https://github.com/Jonathanthedeveloper/agentic-wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-fd-border bg-fd-card px-6 py-3 text-sm font-medium text-fd-foreground transition hover:bg-fd-accent"
            >
              GitHub
            </a>
          </div>
        </section>

        {/* Chain Selector */}
        <section className="border-t border-fd-border py-16">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-xl font-semibold text-fd-foreground">
              Choose Chain
            </h2>
            
            <div className="mt-6">
              <ChainSelector selected={selectedChain} onSelect={setSelectedChain} />
            </div>

            {currentPlugins.length > 0 ? (
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {currentPlugins.map((plugin) => (
                  <div
                    key={plugin.name}
                    className="rounded-lg border border-fd-border bg-fd-card p-4 text-center transition hover:border-fd-primary"
                  >
                    <div className="font-medium text-fd-foreground">{plugin.name}</div>
                    <div className="mt-1 text-xs text-fd-muted-foreground">{plugin.desc}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-lg border border-dashed border-fd-border bg-fd-accent/50 py-12">
                <p className="text-fd-muted-foreground">Coming soon</p>
              </div>
            )}
          </div>
        </section>

        {/* Code Example */}
        <section className="border-t border-fd-border py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-xl font-semibold text-fd-foreground">
              Works With Any AI Framework
            </h2>

            <div className="mt-8 rounded-lg border border-fd-border bg-fd-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-fd-border bg-fd-accent px-4 py-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
              <pre className="p-4 text-xs font-mono text-fd-foreground overflow-x-auto">
{`import { chat } from '@tanstack/ai';
import { toTanstackTools } from '@agentic-wallet/adapters-tanstack';
import { SolanaAgentWallet, createKeypairProvider } from '@agentic-wallet/solana';
import { pumpfunPlugin, jupiterPlugin } from '@agentic-wallet/solana/plugin';

const wallet = new SolanaAgentWallet({
  provider: createKeypairProvider(key),
  rpcUrl,
}).use(pumpfunPlugin()).use(jupiterPlugin());

const tools = toTanstackTools(wallet);

// AI agent can now trade
chat({
  message: 'Buy 0.1 SOL worth of tokens',
  tools,
});`}
              </pre>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-fd-muted-foreground">
              <span>TanStack AI</span>
              <span>·</span>
              <span>Vercel AI SDK</span>
              <span>·</span>
              <span>MCP</span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-fd-border py-16">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h2 className="text-xl font-semibold text-fd-foreground">
              Start Building
            </h2>
            <p className="mt-2 text-sm text-fd-muted-foreground">
              See examples and documentation
            </p>
            
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/docs/$"
                params={{ _splat: 'getting-started/installation' }}
                className="rounded-md bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition hover:opacity-90"
              >
                Documentation
              </Link>
              <Link
                to="/docs/$"
                params={{ _splat: 'examples' }}
                className="rounded-md border border-fd-border bg-fd-card px-5 py-2.5 text-sm font-medium text-fd-foreground transition hover:bg-fd-accent"
              >
                Examples
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-fd-border py-8 text-center text-sm text-fd-muted-foreground">
          <p>MIT License</p>
        </footer>
      </main>
    </HomeLayout>
  );
}
