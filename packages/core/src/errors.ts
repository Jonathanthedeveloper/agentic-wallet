export type AgentWalletErrorCode =
  | 'INVALID_ACTION'
  | 'EXECUTOR_FAILURE'
  | 'NETWORK_FAILURE'
  | 'INITIALIZATION_FAILURE';

export interface AgentWalletErrorOptions {
  cause?: unknown;
  details?: Record<string, unknown>;
}

export class AgentWalletError extends Error {
  readonly code: AgentWalletErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: AgentWalletErrorCode, message: string, options: AgentWalletErrorOptions = {}) {
    super(message);
    this.name = 'AgentWalletError';
    this.code = code;
    this.details = options.details;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isAgentWalletError(error: unknown): error is AgentWalletError {
  return error instanceof AgentWalletError;
}
