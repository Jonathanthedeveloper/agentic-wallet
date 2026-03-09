import z from "zod";

export const balanceSchema = z.object({
    address: z.string().optional().describe('Base58 Solana address. Defaults to wallet address.'),
    mint: z.string().optional().describe('SPL token mint address. Omit for native SOL.'),
});

export const transferSchema = z.object({
    to: z.string().describe('Base58 destination address'),
    amount: z.union([z.number().positive(), z.string()]).describe('Human-readable amount (e.g. "1.5")'),
    mint: z.string().optional().describe('SPL token mint address. Omit for native SOL.'),
    createAssociatedTokenAccount: z
        .boolean()
        .optional()
        .describe('Create destination ATA for SPL transfers if it does not exist. Defaults to true.'),
});

export const airdropSchema = z.object({
    address: z.string().optional().describe('Base58 destination address. Defaults to wallet address.'),
    amount: z.union([z.number().positive(), z.string()]).optional().describe('SOL to request. Defaults to 1.'),
});
