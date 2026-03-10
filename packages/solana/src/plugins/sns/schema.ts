import { z } from "zod";

export const registerDomainSchema = z
    .object({
        domain: z.string(),
        space: z.number().min(0).max(10).optional(),
    })
    .describe('Register a new SNS domain. Provide `domain` (e.g. "myname.sol") and optional `space` (0-10) for allocation.');

export const resolveDomainSchema = z
    .object({
        domain: z.string(),
    })
    .describe('Resolve an SNS domain to a Solana address. Provide `domain` (e.g. "myname.sol").');

export const getPrimaryDomainSchema = z
    .object({
        address: z.string().optional(),
    })
    .describe('Get the primary SNS domain for an address. If `address` is omitted, the connected wallet address is used.');

export const getAllRegisteredDomainsForAddressSchema = z
    .object({
        address: z.string().optional(),
    })
    .describe('List all SNS domains registered for an address. If `address` is omitted, the connected wallet address is used.');

// Fixed Price Offers
export const makeFixedPriceOfferSchema = z
    .object({
        amount: z.number(),
        mint: z.string(),
        seller: z.string().optional(),
        domain: z.string(),
        nameOffersId: z.string().optional(),
    })
    .describe('Create a fixed-price listing for a domain. Provide amount (atomic units), mint, seller (optional), and domain.');

export const acceptFixedPriceOfferSchema = z
    .object({
        fixedPriceKey: z.string(),
        domain: z.string(),
        buyer: z.string().optional(),
        source: z.string().optional(),
        referrer: z.string().optional(),
        nameOffersId: z.string().optional(),
    })
    .describe('Buy a fixed-price offer. Provide fixedPriceKey, domain, buyer/source (optional), and optional referrer.');

// Unsolicited Offers
export const makeUnsolicitedOfferSchema = z
    .object({
        amount: z.number(),
        domain: z.string(),
        owner: z.string().optional(),
        mint: z.string(),
        tokenSource: z.string(),
        nameOffersId: z.string().optional(),
    })
    .describe('Place an unsolicited offer on a domain. Funds are escrowed.');

export const acceptUnsolicitedOfferSchema = z
    .object({
        offerKey: z.string(),
        offerOwner: z.string(),
        domain: z.string(),
        destination: z.string(),
        offerEscrow: z.string(),
        referrer: z.string().optional(),
        nameOffersId: z.string().optional(),
    })
    .describe('Accept an unsolicited offer and receive funds.');

export const cancelUnsolicitedOfferSchema = z
    .object({
        owner: z.string().optional(),
        tokenDestination: z.string(),
        offerKey: z.string(),
        nameOffersId: z.string().optional(),
    })
    .describe('Cancel an unsolicited offer and return funds to the offer owner.');

// Category Offers
export const makeCategoryOfferSchema = z
    .object({
        amount: z.number(),
        nbDomains: z.number(),
        categoryKey: z.string(),
        buyer: z.string().optional(),
        nameOffersId: z.string().optional(),
    })
    .describe('Make a category-wide offer for multiple domains.');

export const acceptCategoryOfferSchema = z
    .object({
        categoryOfferKey: z.string(),
        domain: z.string(),
        memberKey: z.string(),
        seller: z.string().optional(),
        referrer: z.string().optional(),
        nameOffersId: z.string().optional(),
    })
    .describe('Accept (take) a category offer for a specific domain.');

// P2P Offers
export const makeP2POfferSchema = z
    .object({
        amount: z.number(),
        owner: z.string().optional(),
        baseDomains: z.array(z.string()).optional(),
        quoteDomains: z.array(z.string()).optional(),
        endDate: z.number().optional(),
        counterParty: z.string(),
        nameOffersId: z.string().optional(),
    })
    .describe('Create a P2P offer targeted to a counterparty.');

export const acceptP2POfferSchema = z
    .object({
        p2pKey: z.string(),
        nameOffersId: z.string().optional(),
    })
    .describe('Accept a P2P offer by pubkey.');

export const cancelP2POfferSchema = z
    .object({
        p2pKey: z.string(),
        owner: z.string().optional(),
        nameOffersId: z.string().optional(),
    })
    .describe('Cancel a P2P offer previously created by the owner.');