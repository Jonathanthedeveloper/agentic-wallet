import { describe, expect, it } from 'bun:test';
import { AgentWallet } from '../packages/core/dist/index.js';
import { z } from 'zod';

describe('core wallet', () => {
  it('registers plugin methods on wallet', () => {
    const wallet = new AgentWallet();

    const extended = wallet.use({
      name: 'test-plugin',
      register: () => ({
        methods: {
          greet: async (input?: { name?: string }) => `Hello, ${input?.name ?? 'world'}!`,
        },
        tools: [
          {
            name: 'greet',
            description: 'Greet someone',
            inputSchema: z.object({ name: z.string().optional() }),
            execute: async (input: { name?: string }) => `Hello, ${input?.name ?? 'world'}!`,
          },
        ],
      }),
    });

    expect(typeof extended.greet).toBe('function');
  });

  it('returns registered tools via getTools()', () => {
    const wallet = new AgentWallet();

    wallet.use({
      name: 'test-plugin',
      register: () => ({
        methods: {
          doStuff: async () => 'done',
        },
        tools: [
          {
            name: 'do_stuff',
            description: 'Does stuff',
            inputSchema: z.object({}),
            execute: async () => 'done',
          },
        ],
      }),
    });

    const tools = wallet.getTools();
    expect(tools).toHaveLength(1);
    expect(tools[0]!.name).toBe('do_stuff');
  });

  it('accumulates tools from multiple plugins', () => {
    const wallet = new AgentWallet();

    wallet
      .use({
        name: 'plugin-a',
        register: () => ({
          methods: { a: async () => 1 },
          tools: [{ name: 'tool_a', description: 'A', inputSchema: z.object({}), execute: async () => 1 }],
        }),
      })
      .use({
        name: 'plugin-b',
        register: () => ({
          methods: { b: async () => 2 },
          tools: [{ name: 'tool_b', description: 'B', inputSchema: z.object({}), execute: async () => 2 }],
        }),
      });

    expect(wallet.getTools()).toHaveLength(2);
  });
});
