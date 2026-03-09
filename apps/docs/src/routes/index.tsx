import { createFileRoute, Link } from '@tanstack/react-router';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center px-4 py-12 sm:px-6">
        <section className="w-full rounded-2xl border border-fd-border bg-fd-card p-8 sm:p-12">
          <p className="text-xs font-medium tracking-[0.12em] text-fd-muted-foreground uppercase">
            Agentic Wallet
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-fd-foreground sm:text-5xl">
            Chain-Agnostic Wallet Runtime
            <br />
            For AI Agents
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-fd-muted-foreground sm:text-lg">
            A minimal TypeScript library for building wallet tools that AI agents can call.
            Core is chain-agnostic, with chain packages and adapters layered on top.
          </p>
          <div className="mt-8">
            <Link
              to="/docs/$"
              params={{ _splat: 'getting-started/installation' }}
              className="inline-flex items-center justify-center rounded-md border border-fd-primary bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition hover:opacity-90"
            >
              Open Documentation
            </Link>
          </div>
        </section>
      </main>
    </HomeLayout>
  );
}
