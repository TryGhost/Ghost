import {describe, expect, it} from 'vitest';
import {createSubscriptionService} from './service.js';
import type {SubscriptionRepository} from './repo.js';
import type {PlanRecord} from './db.js';
import type {MemberRepository} from '../members/repo.js';
import type {MemberRecord} from '../members/db.js';
import {HttpError} from '../../platform/http/errors.js';

const createSubscriptionRepository = (): SubscriptionRepository & {state: () => {sessions: string[]; subscriptions: string[]}} => {
    const plans: PlanRecord[] = [];
    const prices: {id: string; planId: string; cadence: string; amount: number; currency: string}[] = [];
    const offers: {id: string; code: string; amount: number; currency: string; active: number}[] = [];
    const sessions: {id: string; memberId: string; priceId: string; offerId: string | null; createdAt: number; completedAt: number | null}[] = [];
    const subscriptions: {id: string; memberId: string; priceId: string; status: string; createdAt: number; cancelledAt: number | null}[] = [];
    const billingAccounts: {id: string; memberId: string; provider: string; providerCustomerId: string; createdAt: number; updatedAt: number}[] = [];
    const entitlements: {id: string}[] = [];
    const redemptions: {id: string}[] = [];
    const events: {id: string}[] = [];

    return {
        createPlan: async (plan) => {
            plans.push(plan as PlanRecord);
            return plan as PlanRecord;
        },
        listPlans: async () => plans,
        createPrice: async (price) => {
            prices.push(price as {id: string; planId: string; cadence: string; amount: number; currency: string});
            return price as {id: string; planId: string; cadence: string; amount: number; currency: string};
        },
        getPriceById: async (id) => prices.find((price) => price.id === id) ?? null,
        getPricesByPlan: async (planId) => prices.filter((price) => price.planId === planId),
        createOffer: async (offer) => {
            offers.push(offer as {id: string; code: string; amount: number; currency: string; active: number});
            return offer as {id: string; code: string; amount: number; currency: string; active: number};
        },
        getOfferByCode: async (code) => offers.find((offer) => offer.code === code) ?? null,
        createOfferRedemption: async (redemption) => {
            redemptions.push(redemption as {id: string});
            return redemption as {id: string; offerId: string; memberId: string; createdAt: number};
        },
        createCheckoutSession: async (session) => {
            sessions.push({
                id: session.id,
                memberId: session.memberId,
                priceId: session.priceId,
                offerId: session.offerId ?? null,
                createdAt: session.createdAt,
                completedAt: session.completedAt ?? null
            });
            return session as {id: string; memberId: string; priceId: string; offerId: string | null; createdAt: number; completedAt: number | null};
        },
        getCheckoutSessionById: async (id) => sessions.find((session) => session.id === id) ?? null,
        markCheckoutCompleted: async (id, completedAt) => {
            const index = sessions.findIndex((session) => session.id === id);
            const existing = sessions[index];
            if (existing) {
                sessions[index] = {...existing, completedAt};
            }
        },
        createSubscription: async (subscription) => {
            subscriptions.push(subscription as {id: string; memberId: string; priceId: string; status: string; createdAt: number; cancelledAt: number | null});
            return subscription as {id: string; memberId: string; priceId: string; status: string; createdAt: number; cancelledAt: number | null};
        },
        getActiveSubscription: async (memberId, priceId) =>
            subscriptions.find((sub) => sub.memberId === memberId && sub.priceId === priceId && sub.status === 'active') ?? null,
        getSubscriptionByMember: async (memberId) => subscriptions.find((sub) => sub.memberId === memberId) ?? null,
        createBillingAccount: async (account) => {
            billingAccounts.push(account as {id: string; memberId: string; provider: string; providerCustomerId: string; createdAt: number; updatedAt: number});
            return account as {id: string; memberId: string; provider: string; providerCustomerId: string; createdAt: number; updatedAt: number};
        },
        getBillingAccountByMember: async (memberId) => billingAccounts.find((account) => account.memberId === memberId) ?? null,
        createContentEntitlement: async (entitlement) => {
            entitlements.push(entitlement as {id: string});
            return entitlement as {id: string; memberId: string; source: string; sourceId: string; createdAt: number};
        },
        createSubscriptionEvent: async (event) => {
            events.push(event as {id: string});
            return event as {id: string; memberId: string; subscriptionId: string; type: string; createdAt: number};
        },
        state: () => ({
            sessions: sessions.map((session) => session.id),
            subscriptions: subscriptions.map((sub) => sub.id)
        })
    };
};

const createMemberRepository = (): MemberRepository => {
    const members: MemberRecord[] = [];

    return {
        getMemberByEmail: async () => null,
        getMemberById: async (id) => members.find((member) => member.id === id) ?? null,
        createMember: async (member) => {
            members.push(member as MemberRecord);
            return member as MemberRecord;
        },
        createAuthToken: async () => {
            throw new Error('Not implemented');
        },
        getAuthTokenByToken: async () => {
            throw new Error('Not implemented');
        },
        markAuthTokenUsed: async () => undefined,
        createSession: async () => {
            throw new Error('Not implemented');
        },
        getSessionById: async () => {
            throw new Error('Not implemented');
        },
        createAuthEvent: async () => {
            throw new Error('Not implemented');
        },
        cleanupAuthTokens: async () => 0
    };
};

describe('subscription service', () => {
    it('creates plans and prices', async () => {
        const repository = createSubscriptionRepository();
        const members = createMemberRepository();
        const service = createSubscriptionService(repository, members);

        const plan = await service.createPlan({name: 'Pro', monthlyPrice: 500, yearlyPrice: 5000, currency: 'USD'});

        expect(plan.plan.prices.length).toBe(2);
    });

    it('creates checkout sessions and prevents duplicates', async () => {
        const repository = createSubscriptionRepository();
        const members = createMemberRepository();
        const service = createSubscriptionService(repository, members);

        await members.createMember({
            id: 'member-1',
            email: 'member@example.com',
            status: 'free',
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        await repository.createPrice({
            id: 'price-1',
            planId: 'plan-1',
            cadence: 'month',
            amount: 500,
            currency: 'USD'
        });

        const session = await service.createCheckoutSession({memberId: 'member-1', priceId: 'price-1'});

        await repository.createSubscription({
            id: 'sub-1',
            memberId: 'member-1',
            priceId: 'price-1',
            status: 'active',
            createdAt: Date.now(),
            cancelledAt: null
        });

        let error: HttpError | null = null;

        try {
            await service.createCheckoutSession({memberId: 'member-1', priceId: 'price-1'});
        } catch (caught) {
            if (caught instanceof HttpError) {
                error = caught;
            }
        }

        expect(session.session.id).toBeTruthy();
        expect(error?.status).toBe(403);
    });

    it('confirms checkout sessions and issues entitlements', async () => {
        const repository = createSubscriptionRepository();
        const members = createMemberRepository();
        const service = createSubscriptionService(repository, members);

        await members.createMember({
            id: 'member-2',
            email: 'member2@example.com',
            status: 'free',
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        await repository.createPrice({
            id: 'price-2',
            planId: 'plan-2',
            cadence: 'month',
            amount: 500,
            currency: 'USD'
        });

        await repository.createCheckoutSession({
            id: 'checkout-1',
            memberId: 'member-2',
            priceId: 'price-2',
            offerId: null,
            createdAt: Date.now(),
            completedAt: null
        });

        const result = await service.confirmCheckoutSession({sessionId: 'checkout-1'});

        expect(result.subscriptionId).toBeTruthy();
        expect(repository.state().subscriptions.length).toBe(1);
    });
});
