import type { AgentTool, WalletPlugin } from "@agentic-wallet/core";
import type { SolanaAgentWallet } from "src/wallet";
import { getAllRegisteredDomainsForAddressSchema, getPrimaryDomainSchema, registerDomainSchema, resolveDomainSchema, makeFixedPriceOfferSchema, acceptFixedPriceOfferSchema, makeUnsolicitedOfferSchema, acceptUnsolicitedOfferSchema, cancelUnsolicitedOfferSchema, makeCategoryOfferSchema, acceptCategoryOfferSchema, makeP2POfferSchema, acceptP2POfferSchema, cancelP2POfferSchema } from "./schema"
import { z } from "zod";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { registerDomainNameV2, USDC_MINT, resolve, getAllRegisteredDomains, getPrimaryDomain, getAllDomains, getDomainKeySync } from "@bonfida/spl-name-service";
import {
    NAME_OFFERS_ID,
    makeFixedPriceOffer,
    buyFixedPrice,
    getFixedPriceOffersForName,
    makeOffer,
    getOffersForName,
    acceptOffer,
    cancelOffer,
    makeCategoryOffer,
    getCategoryOffer,
    takeCategoryOffer,
    makeP2p,
    getAllP2pOffersForOwner,
    acceptP2p,
    cancelP2p,
} from "@bonfida/name-offers";
import { toExplorerTxUrl } from "src/utils";



import type { SnsMethods } from './types';

export function snsPlugin(): WalletPlugin<SolanaAgentWallet, SnsMethods> {
    return {
        name: 'sns',
        register: (wallet) => {


            async function snsRegisterDomain(input: z.infer<typeof registerDomainSchema>) {
                const { domain, space = 0 } = input;

                const buyer = new PublicKey(wallet.address);
                const buyerTokenAccount = await getAssociatedTokenAddress(
                    USDC_MINT,
                    buyer
                );

                const ix = await registerDomainNameV2(
                    wallet.connection,
                    domain,
                    space,
                    buyer,
                    buyerTokenAccount,
                    USDC_MINT,
                );

                const tx = new Transaction().add(...ix);

                const signature = await wallet.provider.signAndSendTransaction?.(tx);

                return {
                    success: !!signature?.signature,
                    signature: signature?.signature,
                    explorerUrl: signature ? toExplorerTxUrl(signature.signature) : undefined
                }
            }

            async function snsResolveDomain(input: z.infer<typeof resolveDomainSchema>) {
                const resolvedAddress = await resolve(wallet.connection, input.domain);

                return {
                    domain: input.domain,
                    resolvedAddress: resolvedAddress?.toBase58()
                }
            }

            async function snsGetPrimaryDomain(input: z.infer<typeof getPrimaryDomainSchema>) {

                const result = await getPrimaryDomain(wallet.connection, new PublicKey(input.address ?? wallet.address));

                return {
                    domain: result.domain?.toString(),
                    reverse: !!result.reverse
                }
            }

            async function snsGetAllRegisteredDomains() {

                const registeredDomains = await getAllRegisteredDomains(wallet.connection);

                return registeredDomains
            }

            async function snsGetAllRegisteredDomainsForAddress(input: z.infer<typeof getAllRegisteredDomainsForAddressSchema>) {

                const address = new PublicKey(input.address ?? wallet.address);

                const domains = await getAllDomains(wallet.connection, address);

                return {
                    address: address.toBase58(),
                    domains
                }
            }

            function resolveDomainToPubkey(domainOrPubkey: string) {
                try {
                    if (domainOrPubkey.includes('.')) return getDomainKeySync(domainOrPubkey).pubkey;
                } catch (e) {
                    // fallthrough
                }
                return new PublicKey(domainOrPubkey);
            }

            async function snsMakeFixedPriceOffer(input: z.infer<typeof makeFixedPriceOfferSchema>) {
                const seller = new PublicKey(input.seller ?? wallet.address);
                const domainKey = resolveDomainToPubkey(input.domain);
                const mint = new PublicKey(input.mint);

                const programId = input.nameOffersId ? new PublicKey(input.nameOffersId) : NAME_OFFERS_ID

                const ix = await makeFixedPriceOffer(
                    wallet.connection,
                    input.amount,
                    mint,
                    seller,
                    domainKey,
                    programId
                );
                const tx = new Transaction().add(...ix);
                const signature = await wallet.provider.signAndSendTransaction?.(tx);
                return {
                    success: !!signature?.signature,
                    signature: signature?.signature,
                    explorerUrl: signature ? toExplorerTxUrl(signature.signature) : undefined,
                };
            }

            async function snsAcceptFixedPriceOffer(input: z.infer<typeof acceptFixedPriceOfferSchema>) {
                const buyer = new PublicKey(input.buyer ?? wallet.address);
                const source = input.source ? new PublicKey(input.source) : await getAssociatedTokenAddress(USDC_MINT, buyer);
                const fixedPriceKey = new PublicKey(input.fixedPriceKey);

                const programId = input.nameOffersId ? new PublicKey(input.nameOffersId) : NAME_OFFERS_ID


                const ix = await buyFixedPrice(
                    wallet.connection,
                    fixedPriceKey,
                    buyer,
                    source,
                    programId,
                    input.referrer ? new PublicKey(input.referrer) : undefined
                );
                const tx = new Transaction().add(...ix);
                const signature = await wallet.provider.signAndSendTransaction?.(tx);
                return {
                    success: !!signature?.signature,
                    signature: signature?.signature,
                    explorerUrl: signature ? toExplorerTxUrl(signature.signature) : undefined,
                };
            }

            async function snsMakeUnsolicitedOffer(input: z.infer<typeof makeUnsolicitedOfferSchema>) {
                const domainKey = resolveDomainToPubkey(input.domain);
                const owner = new PublicKey(input.owner ?? wallet.address);
                const mint = new PublicKey(input.mint);
                const tokenSource = new PublicKey(input.tokenSource);
                const programId = input.nameOffersId ? new PublicKey(input.nameOffersId) : NAME_OFFERS_ID


                const ix = await makeOffer(
                    input.amount,
                    domainKey,
                    owner,
                    mint,
                    tokenSource,
                    programId
                );
                const tx = new Transaction().add(...ix);
                const signature = await wallet.provider.signAndSendTransaction?.(tx);
                return {
                    success: !!signature?.signature,
                    signature: signature?.signature,
                    explorerUrl: signature ? toExplorerTxUrl(signature.signature) : undefined,
                };
            }

            async function snsAcceptUnsolicitedOffer(input: z.infer<typeof acceptUnsolicitedOfferSchema>) {
                const domainKey = resolveDomainToPubkey(input.domain);
                const offerKey = new PublicKey(input.offerKey);
                const offerOwner = new PublicKey(input.offerOwner);
                const destination = new PublicKey(input.destination);
                const offerEscrow = new PublicKey(input.offerEscrow);
                const domainOwner = new PublicKey(wallet.address);
                const programId = input.nameOffersId ? new PublicKey(input.nameOffersId) : NAME_OFFERS_ID


                const ix = await acceptOffer(
                    wallet.connection,
                    programId,
                    offerKey,
                    offerOwner,
                    domainOwner,
                    domainKey,
                    offerEscrow,
                    destination,
                    input.referrer ? new PublicKey(input.referrer) : undefined
                );
                const tx = new Transaction().add(...ix);
                const signature = await wallet.provider.signAndSendTransaction?.(tx);
                return {
                    success: !!signature?.signature,
                    signature: signature?.signature,
                    explorerUrl: signature ? toExplorerTxUrl(signature.signature) : undefined,
                };
            }

            async function snsCancelUnsolicitedOffer(input: z.infer<typeof cancelUnsolicitedOfferSchema>) {
                const owner = new PublicKey(input.owner ?? wallet.address);
                const tokenDestination = new PublicKey(input.tokenDestination);
                const offerKey = new PublicKey(input.offerKey);
                const programId = input.nameOffersId ? new PublicKey(input.nameOffersId) : NAME_OFFERS_ID


                const ix = await cancelOffer(owner, tokenDestination, offerKey, programId);
                const tx = new Transaction().add(...ix);
                const signature = await wallet.provider.signAndSendTransaction?.(tx);
                return {
                    success: !!signature?.signature,
                    signature: signature?.signature,
                    explorerUrl: signature ? toExplorerTxUrl(signature.signature) : undefined,
                };
            }

            async function snsMakeCategoryOffer(input: z.infer<typeof makeCategoryOfferSchema>) {
                const buyer = new PublicKey(input.buyer ?? wallet.address);
                const categoryKey = new PublicKey(input.categoryKey);
                const programId = input.nameOffersId ? new PublicKey(input.nameOffersId) : NAME_OFFERS_ID


                const ix = await makeCategoryOffer(
                    input.amount,
                    input.nbDomains,
                    categoryKey,
                    programId,
                    buyer
                );
                const tx = new Transaction().add(ix);
                const signature = await wallet.provider.signAndSendTransaction?.(tx);
                return {
                    success: !!signature?.signature,
                    signature: signature?.signature,
                    explorerUrl: signature ? toExplorerTxUrl(signature.signature) : undefined,
                };
            }

            async function snsAcceptCategoryOffer(input: z.infer<typeof acceptCategoryOfferSchema>) {
                const categoryOfferKey = new PublicKey(input.categoryOfferKey);
                const domainKey = resolveDomainToPubkey(input.domain);
                const memberKey = new PublicKey(input.memberKey);
                const seller = new PublicKey(input.seller ?? wallet.address);
                const programId = input.nameOffersId ? new PublicKey(input.nameOffersId) : NAME_OFFERS_ID

                const ix = await takeCategoryOffer(
                    wallet.connection,
                    programId,
                    categoryOfferKey,
                    domainKey,
                    memberKey,
                    seller,
                    input.referrer ? new PublicKey(input.referrer) : undefined
                );
                const tx = new Transaction().add(ix);
                const signature = await wallet.provider.signAndSendTransaction?.(tx);
                return {
                    success: !!signature?.signature,
                    signature: signature?.signature,
                    explorerUrl: signature ? toExplorerTxUrl(signature.signature) : undefined,
                };
            }

            async function snsMakeP2POffer(input: z.infer<typeof makeP2POfferSchema>) {
                const owner = new PublicKey(input.owner ?? wallet.address);
                const baseDomains = (input.baseDomains ?? []).map(resolveDomainToPubkey);
                const quoteDomains = (input.quoteDomains ?? []).map(resolveDomainToPubkey);
                const counterParty = new PublicKey(input.counterParty);
                const programId = input.nameOffersId ? new PublicKey(input.nameOffersId) : NAME_OFFERS_ID

                const ix = await makeP2p(
                    input.amount,
                    owner,
                    baseDomains,
                    quoteDomains,
                    input.endDate,
                    counterParty,
                    programId
                );
                const tx = new Transaction().add(ix);
                const signature = await wallet.provider.signAndSendTransaction?.(tx);
                return {
                    success: !!signature?.signature,
                    signature: signature?.signature,
                    explorerUrl: signature ? toExplorerTxUrl(signature.signature) : undefined,
                };
            }

            async function snsAcceptP2POffer(input: z.infer<typeof acceptP2POfferSchema>) {
                const p2pKey = new PublicKey(input.p2pKey);
                const programId = input.nameOffersId ? new PublicKey(input.nameOffersId) : NAME_OFFERS_ID


                const ix = await acceptP2p(wallet.connection, programId, p2pKey);
                const tx = new Transaction().add(...ix);
                const signature = await wallet.provider.signAndSendTransaction?.(tx);
                return {
                    success: !!signature?.signature,
                    signature: signature?.signature,
                    explorerUrl: signature ? toExplorerTxUrl(signature.signature) : undefined,
                };
            }

            async function snsCancelP2POffer(input: z.infer<typeof cancelP2POfferSchema>) {
                const owner = new PublicKey(input.owner ?? wallet.address);
                const p2pKey = new PublicKey(input.p2pKey);
                const programId = input.nameOffersId ? new PublicKey(input.nameOffersId) : NAME_OFFERS_ID


                const ix = await cancelP2p(wallet.connection, programId, p2pKey, owner);
                const tx = new Transaction().add(ix);
                const signature = await wallet.provider.signAndSendTransaction?.(tx);
                return {
                    success: !!signature?.signature,
                    signature: signature?.signature,
                    explorerUrl: signature ? toExplorerTxUrl(signature.signature) : undefined,
                };
            }


            const tools: AgentTool[] = [
                {
                    name: 'sns_register_domain',
                    description: 'Register an SNS domain for the connected wallet or a provided buyer address.',
                    inputSchema: registerDomainSchema,
                    execute: (input) => snsRegisterDomain(input as any),
                },
                {
                    name: 'sns_resolve_domain',
                    description: 'Resolve an SNS domain to a Solana address.',
                    inputSchema: resolveDomainSchema,
                    execute: (input) => snsResolveDomain(input as any),
                },
                {
                    name: 'sns_get_primary_domain',
                    description: 'Get the primary SNS domain for an address (or connected wallet).',
                    inputSchema: getPrimaryDomainSchema,
                    execute: (input) => snsGetPrimaryDomain(input as any),
                },
                {
                    name: 'sns_get_all_registered_domains',
                    description: 'List all registered SNS domains (global).',
                    inputSchema: z.object({}),
                    execute: () => snsGetAllRegisteredDomains(),
                },
                {
                    name: 'sns_get_registered_domains_for_address',
                    description: 'List all SNS domains registered for a specific address.',
                    inputSchema: getAllRegisteredDomainsForAddressSchema,
                    execute: (input) => snsGetAllRegisteredDomainsForAddress(input as any),
                },

                // Fixed price offers
                {
                    name: 'sns_make_fixed_price_offer',
                    description: 'Create a fixed-price listing for a domain.',
                    inputSchema: makeFixedPriceOfferSchema,
                    execute: (input) => snsMakeFixedPriceOffer(input as any),
                },
                {
                    name: 'sns_accept_fixed_price_offer',
                    description: 'Buy a fixed-price offer.',
                    inputSchema: acceptFixedPriceOfferSchema,
                    execute: (input) => snsAcceptFixedPriceOffer(input as any),
                },

                // Unsolicited offers
                {
                    name: 'sns_make_unsolicited_offer',
                    description: 'Place an unsolicited offer on a domain. Funds are escrowed.',
                    inputSchema: makeUnsolicitedOfferSchema,
                    execute: (input) => snsMakeUnsolicitedOffer(input as any),
                },
                {
                    name: 'sns_accept_unsolicited_offer',
                    description: 'Accept an unsolicited offer and receive funds.',
                    inputSchema: acceptUnsolicitedOfferSchema,
                    execute: (input) => snsAcceptUnsolicitedOffer(input as any),
                },
                {
                    name: 'sns_cancel_unsolicited_offer',
                    description: 'Cancel an unsolicited offer and return funds to the offer owner.',
                    inputSchema: cancelUnsolicitedOfferSchema,
                    execute: (input) => snsCancelUnsolicitedOffer(input as any),
                },

                // Category offers
                {
                    name: 'sns_make_category_offer',
                    description: 'Make a category-wide offer for multiple domains.',
                    inputSchema: makeCategoryOfferSchema,
                    execute: (input) => snsMakeCategoryOffer(input as any),
                },
                {
                    name: 'sns_accept_category_offer',
                    description: 'Accept (take) a category offer for a specific domain.',
                    inputSchema: acceptCategoryOfferSchema,
                    execute: (input) => snsAcceptCategoryOffer(input as any),
                },

                // P2P offers
                {
                    name: 'sns_make_p2p_offer',
                    description: 'Create a P2P offer targeted to a counterparty.',
                    inputSchema: makeP2POfferSchema,
                    execute: (input) => snsMakeP2POffer(input as any),
                },
                {
                    name: 'sns_accept_p2p_offer',
                    description: 'Accept a P2P offer by pubkey.',
                    inputSchema: acceptP2POfferSchema,
                    execute: (input) => snsAcceptP2POffer(input as any),
                },
                {
                    name: 'sns_cancel_p2p_offer',
                    description: 'Cancel a P2P offer previously created by the owner.',
                    inputSchema: cancelP2POfferSchema,
                    execute: (input) => snsCancelP2POffer(input as any),
                },
            ];

            return {
                methods: {
                    snsRegisterDomain,
                    snsResolveDomain,
                    snsGetPrimaryDomain,
                    snsGetAllRegisteredDomains,
                    snsGetAllRegisteredDomainsForAddress,

                    snsMakeFixedPriceOffer,
                    snsAcceptFixedPriceOffer,

                    snsMakeUnsolicitedOffer,
                    snsAcceptUnsolicitedOffer,
                    snsCancelUnsolicitedOffer,

                    snsMakeCategoryOffer,
                    snsAcceptCategoryOffer,

                    snsMakeP2POffer,
                    snsAcceptP2POffer,
                    snsCancelP2POffer,
                },
                tools,
            };
        }
    }
}