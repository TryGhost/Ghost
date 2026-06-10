import {and, eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    billingAccountTable,
    checkoutSessionTable,
    contentEntitlementTable,
    subscriptionEventTable,
    offerRedemptionTable,
    offerTable,
    planTable,
    priceTable,
    subscriptionTable,
    type BillingAccountRecord,
    type CheckoutSessionRecord,
    type ContentEntitlementRecord,
    type NewBillingAccountRecord,
    type NewCheckoutSessionRecord,
    type NewContentEntitlementRecord,
    type NewOfferRecord,
    type NewOfferRedemptionRecord,
    type NewPlanRecord,
    type NewPriceRecord,
    type NewSubscriptionRecord,
    type NewSubscriptionEventRecord,
    type OfferRecord,
    type OfferRedemptionRecord,
    type PlanRecord,
    type PriceRecord,
    type SubscriptionRecord,
    type SubscriptionEventRecord
} from './db.js';

export type SubscriptionRepository = {
    createPlan: (plan: NewPlanRecord) => Promise<PlanRecord>;
    listPlans: () => Promise<PlanRecord[]>;
    createPrice: (price: NewPriceRecord) => Promise<PriceRecord>;
    getPriceById: (id: string) => Promise<PriceRecord | null>;
    getPricesByPlan: (planId: string) => Promise<PriceRecord[]>;
    createOffer: (offer: NewOfferRecord) => Promise<OfferRecord>;
    getOfferByCode: (code: string) => Promise<OfferRecord | null>;
    createOfferRedemption: (redemption: NewOfferRedemptionRecord) => Promise<OfferRedemptionRecord>;
    createCheckoutSession: (session: NewCheckoutSessionRecord) => Promise<CheckoutSessionRecord>;
    getCheckoutSessionById: (id: string) => Promise<CheckoutSessionRecord | null>;
    markCheckoutCompleted: (id: string, completedAt: number) => Promise<void>;
    createSubscription: (subscription: NewSubscriptionRecord) => Promise<SubscriptionRecord>;
    getActiveSubscription: (memberId: string, priceId: string) => Promise<SubscriptionRecord | null>;
    getSubscriptionByMember: (memberId: string) => Promise<SubscriptionRecord | null>;
    createBillingAccount: (account: NewBillingAccountRecord) => Promise<BillingAccountRecord>;
    getBillingAccountByMember: (memberId: string) => Promise<BillingAccountRecord | null>;
    createContentEntitlement: (entitlement: NewContentEntitlementRecord) => Promise<ContentEntitlementRecord>;
    createSubscriptionEvent: (event: NewSubscriptionEventRecord) => Promise<SubscriptionEventRecord>;
};

export const createSubscriptionRepository = (db: DbClient): SubscriptionRepository => {
    const createPlan = async (plan: NewPlanRecord) => {
        await db.insert(planTable).values(plan);
        const rows = await db.select().from(planTable).where(eq(planTable.id, plan.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Plan missing after insert');
        }
        return rows[0];
    };

    const listPlans = async () => {
        return db.select().from(planTable);
    };

    const createPrice = async (price: NewPriceRecord) => {
        await db.insert(priceTable).values(price);
        const rows = await db.select().from(priceTable).where(eq(priceTable.id, price.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Price missing after insert');
        }
        return rows[0];
    };

    const getPriceById = async (id: string) => {
        const rows = await db.select().from(priceTable).where(eq(priceTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const getPricesByPlan = async (planId: string) => {
        return db.select().from(priceTable).where(eq(priceTable.planId, planId));
    };

    const createOffer = async (offer: NewOfferRecord) => {
        await db.insert(offerTable).values(offer);
        const rows = await db.select().from(offerTable).where(eq(offerTable.id, offer.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Offer missing after insert');
        }
        return rows[0];
    };

    const getOfferByCode = async (code: string) => {
        const rows = await db.select().from(offerTable).where(eq(offerTable.code, code)).limit(1);
        return rows[0] ?? null;
    };

    const createOfferRedemption = async (redemption: NewOfferRedemptionRecord) => {
        await db.insert(offerRedemptionTable).values(redemption);
        const rows = await db.select().from(offerRedemptionTable).where(eq(offerRedemptionTable.id, redemption.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Offer redemption missing after insert');
        }
        return rows[0];
    };

    const createCheckoutSession = async (session: NewCheckoutSessionRecord) => {
        await db.insert(checkoutSessionTable).values(session);
        const rows = await db.select().from(checkoutSessionTable).where(eq(checkoutSessionTable.id, session.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Checkout session missing after insert');
        }
        return rows[0];
    };

    const getCheckoutSessionById = async (id: string) => {
        const rows = await db.select().from(checkoutSessionTable).where(eq(checkoutSessionTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const markCheckoutCompleted = async (id: string, completedAt: number) => {
        await db
            .update(checkoutSessionTable)
            .set({completedAt})
            .where(eq(checkoutSessionTable.id, id));
    };

    const createSubscription = async (subscription: NewSubscriptionRecord) => {
        await db.insert(subscriptionTable).values(subscription);
        const rows = await db.select().from(subscriptionTable).where(eq(subscriptionTable.id, subscription.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Subscription missing after insert');
        }
        return rows[0];
    };

    const getActiveSubscription = async (memberId: string, priceId: string) => {
        const rows = await db
            .select()
            .from(subscriptionTable)
            .where(and(
                eq(subscriptionTable.memberId, memberId),
                eq(subscriptionTable.priceId, priceId),
                eq(subscriptionTable.status, 'active')
            ))
            .limit(1);
        return rows[0] ?? null;
    };

    const getSubscriptionByMember = async (memberId: string) => {
        const rows = await db.select().from(subscriptionTable).where(eq(subscriptionTable.memberId, memberId)).limit(1);
        return rows[0] ?? null;
    };

    const createBillingAccount = async (account: NewBillingAccountRecord) => {
        await db.insert(billingAccountTable).values(account);
        const rows = await db.select().from(billingAccountTable).where(eq(billingAccountTable.id, account.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Billing account missing after insert');
        }
        return rows[0];
    };

    const getBillingAccountByMember = async (memberId: string) => {
        const rows = await db.select().from(billingAccountTable).where(eq(billingAccountTable.memberId, memberId)).limit(1);
        return rows[0] ?? null;
    };

    const createContentEntitlement = async (entitlement: NewContentEntitlementRecord) => {
        await db.insert(contentEntitlementTable).values(entitlement);
        const rows = await db.select().from(contentEntitlementTable).where(eq(contentEntitlementTable.id, entitlement.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Content entitlement missing after insert');
        }
        return rows[0];
    };

    const createSubscriptionEvent = async (event: NewSubscriptionEventRecord) => {
        await db.insert(subscriptionEventTable).values(event);
        const rows = await db.select().from(subscriptionEventTable).where(eq(subscriptionEventTable.id, event.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Subscription event missing after insert');
        }
        return rows[0];
    };

    return {
        createPlan,
        listPlans,
        createPrice,
        getPriceById,
        getPricesByPlan,
        createOffer,
        getOfferByCode,
        createOfferRedemption,
        createCheckoutSession,
        getCheckoutSessionById,
        markCheckoutCompleted,
        createSubscription,
        getActiveSubscription,
        getSubscriptionByMember,
        createBillingAccount,
        getBillingAccountByMember,
        createContentEntitlement,
        createSubscriptionEvent
    };
};
