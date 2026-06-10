import {eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    billingProfileTable,
    marketplaceEntitlementTable,
    type BillingProfileRecord,
    type MarketplaceEntitlementRecord,
    type NewBillingProfileRecord,
    type NewMarketplaceEntitlementRecord
} from './db.js';

export type BillingRepository = {
    getProfile: () => Promise<BillingProfileRecord | null>;
    upsertProfile: (profile: NewBillingProfileRecord) => Promise<BillingProfileRecord>;
    listEntitlements: () => Promise<MarketplaceEntitlementRecord[]>;
    upsertEntitlement: (entitlement: NewMarketplaceEntitlementRecord) => Promise<MarketplaceEntitlementRecord>;
    expireEntitlements: () => Promise<void>;
};

export const createBillingRepository = (db: DbClient): BillingRepository => {
    const getProfile = async () => {
        const rows = await db.select().from(billingProfileTable).limit(1);
        return rows[0] ?? null;
    };

    const upsertProfile = async (profile: NewBillingProfileRecord) => {
        await db
            .insert(billingProfileTable)
            .values(profile)
            .onConflictDoUpdate({target: billingProfileTable.id, set: profile});
        const rows = await db.select().from(billingProfileTable).where(eq(billingProfileTable.id, profile.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Billing profile missing after upsert');
        }
        return rows[0];
    };

    const listEntitlements = async () => {
        return db.select().from(marketplaceEntitlementTable);
    };

    const upsertEntitlement = async (entitlement: NewMarketplaceEntitlementRecord) => {
        await db
            .insert(marketplaceEntitlementTable)
            .values(entitlement)
            .onConflictDoUpdate({target: marketplaceEntitlementTable.id, set: entitlement});
        const rows = await db
            .select()
            .from(marketplaceEntitlementTable)
            .where(eq(marketplaceEntitlementTable.id, entitlement.id))
            .limit(1);
        if (!rows[0]) {
            throw new Error('Entitlement missing after upsert');
        }
        return rows[0];
    };

    const expireEntitlements = async () => {
        await db
            .update(marketplaceEntitlementTable)
            .set({status: 'expired'})
            .where(eq(marketplaceEntitlementTable.status, 'active'));
    };

    return {
        getProfile,
        upsertProfile,
        listEntitlements,
        upsertEntitlement,
        expireEntitlements
    };
};
