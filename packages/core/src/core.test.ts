import { describe, it, expect } from "bun:test";
import { AgentWallet } from "../src/core";
import type { AgentTool, WalletPlugin } from "../src/types";

describe("AgentWallet", () => {
    it("registers plugin tools", () => {
        const wallet = new AgentWallet();

        const mockTools: AgentTool[] = [
            { name: "toolA" } as AgentTool,
            { name: "toolB" } as AgentTool,
        ];

        const plugin: WalletPlugin<AgentWallet, {}> = {
            name: "mockPlugin",
            register() {
                return {
                    tools: mockTools,
                    methods: {},
                };
            },
        };

        wallet.use(plugin);

        const tools = wallet.getTools();
        expect(tools).toHaveLength(2);
        expect(tools).toEqual(mockTools);

        // ensure immutability of returned array
        tools.push({ name: "toolC" } as AgentTool);
        expect(wallet.getTools()).toHaveLength(2);
    });

    it("attaches plugin methods to the wallet instance", () => {
        const wallet = new AgentWallet();

        const plugin: WalletPlugin<
            AgentWallet,
            {
                hello(): string;
                add(a: number, b: number): number;
            }
        > = {
            name: "methodPlugin",
            register() {
                return {
                    tools: [],
                    methods: {
                        hello() {
                            return "world";
                        },
                        add(a: number, b: number) {
                            return a + b;
                        },
                    },
                };
            },
        };

        const extendedWallet = wallet.use(plugin);

        expect(typeof extendedWallet.hello).toBe("function");
        expect(extendedWallet.hello()).toBe("world");
        expect(extendedWallet.add(2, 3)).toBe(5);
    });

    it("supports multiple plugins", () => {
        const wallet = new AgentWallet();

        const pluginA: WalletPlugin<
            AgentWallet,
            { foo(): string }
        > = {
            name: "pluginA",
            register() {
                return {
                    tools: [{ name: "toolA" } as AgentTool],
                    methods: {
                        foo() {
                            return "foo";
                        },
                    },
                };
            },
        };

        const pluginB: WalletPlugin<
            AgentWallet & { foo(): string },
            { bar(): string }
        > = {
            name: "pluginB",
            register() {
                return {
                    tools: [{ name: "toolB" } as AgentTool],
                    methods: {
                        bar() {
                            return "bar";
                        },
                    },
                };
            },
        };

        const extended = wallet.use(pluginA).use(pluginB);

        expect(extended.foo()).toBe("foo");
        expect(extended.bar()).toBe("bar");

        const tools = extended.getTools();
        expect(tools.map(t => (t as any).name)).toEqual(["toolA", "toolB"]);
    });
});