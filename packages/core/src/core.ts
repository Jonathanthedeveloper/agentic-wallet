import type { AgentTool, AnyFunction, WalletPlugin } from './types';

export class AgentWallet {
  private readonly _tools: AgentTool[] = [];

  use<TMethods extends { [K in keyof TMethods]: AnyFunction }>(
    plugin: WalletPlugin<this, TMethods>,
  ): this & TMethods {
    const registration = plugin.register(this);
    this._tools.push(...registration.tools);
    Object.assign(this, registration.methods);
    return this as this & TMethods;
  }

  getTools(): AgentTool[] {
    return [...this._tools];
  }
}
