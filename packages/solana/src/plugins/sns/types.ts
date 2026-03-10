export type TxResult = {
    success: boolean;
    signature?: string;
    explorerUrl?: string;
};

export type SnsMethods = {
    snsRegisterDomain(input: { domain: string; space?: number }): Promise<TxResult>;
    snsResolveDomain(input: { domain: string }): Promise<{ domain: string; resolvedAddress?: string }>;
    snsGetPrimaryDomain(input?: { address?: string | null }): Promise<{ domain?: string; reverse?: boolean }>;
    snsGetAllRegisteredDomains(): Promise<unknown>;
    snsGetAllRegisteredDomainsForAddress(input?: { address?: string | null }): Promise<{ address: string; domains: unknown }>;

    snsMakeFixedPriceOffer(input: { amount: number; mint: string; seller?: string; domain: string; nameOffersId?: string }): Promise<TxResult>;
    snsAcceptFixedPriceOffer(input: { fixedPriceKey: string; buyer?: string; source?: string; referrer?: string; nameOffersId?: string }): Promise<TxResult>;

    snsMakeUnsolicitedOffer(input: { amount: number; domain: string; owner?: string; mint: string; tokenSource: string; nameOffersId?: string }): Promise<TxResult>;
    snsAcceptUnsolicitedOffer(input: { offerKey: string; offerOwner: string; destination: string; offerEscrow: string; referrer?: string; nameOffersId?: string }): Promise<TxResult>;
    snsCancelUnsolicitedOffer(input: { owner?: string; tokenDestination: string; offerKey: string; nameOffersId?: string }): Promise<TxResult>;

    snsMakeCategoryOffer(input: { amount: number; nbDomains: number; categoryKey: string; buyer?: string; nameOffersId?: string }): Promise<TxResult>;
    snsAcceptCategoryOffer(input: { categoryOfferKey: string; domain: string; memberKey: string; seller?: string; referrer?: string; nameOffersId?: string }): Promise<TxResult>;

    snsMakeP2POffer(input: { amount: number; owner?: string; baseDomains?: string[]; quoteDomains?: string[]; endDate?: number; counterParty: string; nameOffersId?: string }): Promise<TxResult>;
    snsAcceptP2POffer(input: { p2pKey: string; nameOffersId?: string }): Promise<TxResult>;
    snsCancelP2POffer(input: { p2pKey: string; owner?: string; nameOffersId?: string }): Promise<TxResult>;
};
