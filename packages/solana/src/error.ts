import { AgentWalletError, type AgentWalletErrorCode, type AgentWalletErrorOptions } from '@agentic-wallet/core';

export class SolanaAgentWalletError extends AgentWalletError {
    constructor(code: AgentWalletErrorCode, message: string, options: AgentWalletErrorOptions = {}) {
        super(code, message, options);
        this.name = 'SolanaAgentWalletError';
    }
}