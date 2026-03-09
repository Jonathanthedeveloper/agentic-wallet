import type { ZodType } from 'zod';


export interface AgentTool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  inputSchema: ZodType<TInput>;
  execute: (input: TInput) => Promise<TOutput>;
}

export interface PluginRegistration<TMethods> {
  methods: TMethods;
  tools: AgentTool[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any[]) => any;

export interface WalletPlugin<
  TWallet,
  TMethods extends { [K in keyof TMethods]: AnyFunction } = { [key: string]: AnyFunction },
> {
  name: string;
  register(wallet: TWallet): PluginRegistration<TMethods>;
}
