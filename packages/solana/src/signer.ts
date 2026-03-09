import { AgentWalletError } from '@agentic-wallet/core';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export type SolanaSecretKeyInput = Uint8Array | number[] | string;

function assertByteRange(value: number, index: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new AgentWalletError('INVALID_ACTION', `Invalid secret key byte at index ${index}`, {
      details: { index, value },
    });
  }
  return value;
}

function parseJsonByteArray(trimmed: string): Uint8Array | null {
  if (!(trimmed.startsWith('[') && trimmed.endsWith(']'))) return null;
  const parsed = JSON.parse(trimmed) as unknown;
  if (!Array.isArray(parsed)) {
    throw new AgentWalletError('INVALID_ACTION', 'Secret key JSON must be an array of bytes');
  }
  return new Uint8Array(parsed.map((byte, index) => assertByteRange(Number(byte), index)));
}

function parseCommaSeparatedBytes(trimmed: string): Uint8Array | null {
  if (!trimmed.includes(',')) return null;
  const bytes = trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => assertByteRange(Number(part), index));
  return new Uint8Array(bytes);
}

function parseHexSecretKey(trimmed: string): Uint8Array | null {
  const normalized = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-fA-F]+$/.test(normalized) || normalized.length % 2 !== 0) return null;
  return new Uint8Array(Buffer.from(normalized, 'hex'));
}

function parseBase58SecretKey(trimmed: string): Uint8Array | null {
  try {
    const decoded = bs58.decode(trimmed);
    if (decoded.length === 32 || decoded.length === 64) {
      return new Uint8Array(decoded);
    }
  } catch {
    // fall through
  }
  return null;
}

function parseBase64SecretKey(trimmed: string): Uint8Array | null {
  const normalized = trimmed.replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]+=*$/.test(normalized)) return null;

  try {
    const decoded = Buffer.from(normalized, 'base64');
    if (decoded.length === 0) return null;
    const roundTrip = Buffer.from(decoded).toString('base64').replace(/=+$/g, '');
    if (roundTrip !== normalized.replace(/=+$/g, '')) return null;
    return new Uint8Array(decoded);
  } catch {
    return null;
  }
}

function parseStringSecretKey(value: string): Uint8Array {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new AgentWalletError('INVALID_ACTION', 'Secret key string is empty');
  }

  const parsers = [
    parseJsonByteArray,
    parseCommaSeparatedBytes,
    parseHexSecretKey,
    parseBase58SecretKey,
    parseBase64SecretKey,
  ];

  for (const parser of parsers) {
    const parsed = parser(trimmed);
    if (parsed) return parsed;
  }

  throw new AgentWalletError(
    'INVALID_ACTION',
    'Secret key must be base58, base64, hex, JSON byte array, or comma-separated bytes',
  );
}

function normalizeSecretKey(input: SolanaSecretKeyInput): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (Array.isArray(input)) {
    return new Uint8Array(input.map((value, index) => assertByteRange(value, index)));
  }
  return parseStringSecretKey(input);
}

export function createSolanaKeypairFromSecretKey(input: SolanaSecretKeyInput): Keypair {
  const keyBytes = normalizeSecretKey(input);

  if (keyBytes.length === 64) {
    return Keypair.fromSecretKey(keyBytes);
  }

  if (keyBytes.length === 32) {
    return Keypair.fromSeed(keyBytes);
  }

  throw new AgentWalletError('INVALID_ACTION', 'Solana secret key must be 32-byte seed or 64-byte secret key', {
      details: { length: keyBytes.length },
  });
}

export function createSolanaKeypairFromEnv(envVar: string = 'SOLANA_PRIVATE_KEY'): Keypair {
  const value = process.env[envVar];
  if (!value) {
    throw new AgentWalletError('INVALID_ACTION', `Missing required env var ${envVar}`);
  }
  return createSolanaKeypairFromSecretKey(value);
}
