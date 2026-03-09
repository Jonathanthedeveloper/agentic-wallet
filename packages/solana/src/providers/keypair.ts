import { Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import type { SolanaWalletProvider } from '../types';
import { createSolanaKeypairFromSecretKey, type SolanaSecretKeyInput } from '../signer';

export function createKeypairProvider(privateKey: SolanaSecretKeyInput): SolanaWalletProvider {
    const keyPair: Keypair = createSolanaKeypairFromSecretKey(privateKey);

    return {
        publicKey: keyPair.publicKey,
        signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T) => {
            if ('version' in tx) {
                (tx as VersionedTransaction).sign([keyPair]);
            } else {
                (tx as Transaction).sign(keyPair);
            }
            return tx;
        },
        signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]) => {
            return txs.map(tx => {
                if ('version' in tx) {
                    (tx as VersionedTransaction).sign([keyPair]);
                } else {
                    (tx as Transaction).sign(keyPair);
                }
                return tx;
            });
        },
        sendTransaction: async (tx, connection, options) => {
            if (!connection) throw new Error('Connection is required to send transaction');
            if ('version' in tx) {
                return await connection.sendTransaction(tx as VersionedTransaction, options);
            } else {
                return await connection.sendRawTransaction((tx as Transaction).serialize(), options);
            }
        },
        signAndSendTransaction: async (tx, connection, options) => {
            if (!connection) throw new Error('Connection is required to send transaction');
            if ('version' in tx) {
                (tx as VersionedTransaction).sign([keyPair]);
                const signature = await connection.sendTransaction(tx as VersionedTransaction, options);
                return { signature };
            } else {
                (tx as Transaction).sign(keyPair);
                const signature = await connection.sendRawTransaction((tx as Transaction).serialize(), options);
                return { signature };
            }
        },
    };
}
