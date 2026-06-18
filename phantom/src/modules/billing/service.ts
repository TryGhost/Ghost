import {randomUUID} from 'node:crypto';
import type {
    BillingProfileLinkRequest,
    BillingProfileLinkResponse,
    BillingProfileResponse,
    MarketplaceEntitlementListResponse
} from './contracts.js';
import type {BillingRepository} from './repo.js';

export type BillingService = {
    linkProfile: (input: BillingProfileLinkRequest) => Promise<BillingProfileLinkResponse>;
    unlinkProfile: () => Promise<BillingProfileResponse>;
    listEntitlements: () => Promise<MarketplaceEntitlementListResponse>;
    refreshEntitlements: () => Promise<MarketplaceEntitlementListResponse>;
};

export const createBillingService = (repository: BillingRepository): BillingService => {
    const linkProfile = async (input: BillingProfileLinkRequest) => {
        const now = Date.now();
        const profile = await repository.upsertProfile({
            id: randomUUID(),
            siteId: input.siteId,
            status: 'linked',
            linkedAt: now,
            unlinkedAt: null
        });
        const status: 'linked' | 'unlinked' = profile.status === 'linked' ? 'linked' : 'unlinked';
        return {
            profile: {
                id: profile.id,
                siteId: profile.siteId,
                status,
                linkedAt: profile.linkedAt,
                unlinkedAt: profile.unlinkedAt ?? null
            }
        };
    };

    const unlinkProfile = async () => {
        const existing = await repository.getProfile();
        const now = Date.now();
        const profile = await repository.upsertProfile({
            id: existing?.id ?? randomUUID(),
            siteId: existing?.siteId ?? 'site',
            status: 'unlinked',
            linkedAt: existing?.linkedAt ?? now,
            unlinkedAt: now
        });
        const status: 'linked' | 'unlinked' = 'unlinked';
        return {
            profile: {
                id: profile.id,
                siteId: profile.siteId,
                status,
                linkedAt: profile.linkedAt,
                unlinkedAt: profile.unlinkedAt ?? null
            }
        };
    };

    const listEntitlements = async () => {
        const entitlements = await repository.listEntitlements();
        return {
            entitlements: entitlements.map((entitlement) => ({
                id: entitlement.id,
                listingId: entitlement.listingId,
                expiresAt: entitlement.expiresAt,
                status: (entitlement.status === 'active' ? 'active' : 'expired') as 'active' | 'expired',
                createdAt: entitlement.createdAt
            }))
        };
    };

    const refreshEntitlements = async () => {
        await repository.expireEntitlements();
        const now = Date.now();
        await repository.upsertEntitlement({
            id: randomUUID(),
            listingId: 'default',
            expiresAt: now + 1000 * 60 * 60 * 24,
            status: 'active',
            createdAt: now
        });
        return listEntitlements();
    };

    return {
        linkProfile,
        unlinkProfile,
        listEntitlements,
        refreshEntitlements
    };
};
