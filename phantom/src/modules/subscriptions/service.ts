import {randomUUID} from 'node:crypto';
import type {
    CheckoutConfirmRequest,
    CheckoutConfirmResponse,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    OfferCreateRequest,
    OfferCreateResponse,
    PlanCreateRequest,
    PlanCreateResponse
} from './contracts.js';
import type {SubscriptionRepository} from './repo.js';
import type {MemberRepository} from '../members/repo.js';
import {HttpError} from '../../platform/http/errors.js';

export type SubscriptionService = {
    createPlan: (input: PlanCreateRequest) => Promise<PlanCreateResponse>;
    createOffer: (input: OfferCreateRequest) => Promise<OfferCreateResponse>;
    createCheckoutSession: (input: CheckoutSessionRequest) => Promise<CheckoutSessionResponse>;
    confirmCheckoutSession: (input: CheckoutConfirmRequest) => Promise<CheckoutConfirmResponse>;
};

export const createSubscriptionService = (
    repository: SubscriptionRepository,
    memberRepository: MemberRepository
): SubscriptionService => {
    const createPlan = async (input: PlanCreateRequest) => {
        const now = Date.now();
        const planId = randomUUID();
        await repository.createPlan({
            id: planId,
            name: input.name,
            createdAt: now,
            updatedAt: now
        });

        const monthly = await repository.createPrice({
            id: randomUUID(),
            planId,
            cadence: 'month',
            amount: input.monthlyPrice,
            currency: input.currency
        });
        const yearly = await repository.createPrice({
            id: randomUUID(),
            planId,
            cadence: 'year',
            amount: input.yearlyPrice,
            currency: input.currency
        });

        return {
            plan: {
                id: planId,
                name: input.name,
                prices: [
                    {
                        id: monthly.id,
                        cadence: 'month' as const,
                        amount: monthly.amount,
                        currency: monthly.currency
                    },
                    {
                        id: yearly.id,
                        cadence: 'year' as const,
                        amount: yearly.amount,
                        currency: yearly.currency
                    }
                ]
            }
        };
    };

    const createOffer = async (input: OfferCreateRequest) => {
        const existing = await repository.getOfferByCode(input.code);
        if (existing) {
            throw new HttpError(422, 'offer_exists', 'Offer code already exists');
        }

        const offer = await repository.createOffer({
            id: randomUUID(),
            code: input.code,
            amount: input.amount,
            currency: input.currency,
            active: 1
        });

        return {
            offer: {
                id: offer.id,
                code: offer.code,
                amount: offer.amount,
                currency: offer.currency,
                active: offer.active === 1
            }
        };
    };

    const createCheckoutSession = async (input: CheckoutSessionRequest) => {
        const member = await memberRepository.getMemberById(input.memberId);
        if (!member) {
            throw new HttpError(404, 'member_not_found', 'Member not found');
        }

        const price = await repository.getPriceById(input.priceId);
        if (!price) {
            throw new HttpError(404, 'price_not_found', 'Price not found');
        }

        const existing = await repository.getActiveSubscription(input.memberId, input.priceId);
        if (existing) {
            throw new HttpError(403, 'subscription_exists', 'Member already subscribed');
        }

        let offerId: string | null = null;
        if (input.offerCode) {
            const offer = await repository.getOfferByCode(input.offerCode);
            if (!offer || offer.active !== 1) {
                throw new HttpError(404, 'offer_not_found', 'Offer not found');
            }
            offerId = offer.id;
        }

        const session = await repository.createCheckoutSession({
            id: randomUUID(),
            memberId: input.memberId,
            priceId: input.priceId,
            offerId,
            createdAt: Date.now(),
            completedAt: null
        });

        return {
            session: {
                id: session.id,
                memberId: session.memberId,
                priceId: session.priceId,
                offerId: session.offerId ?? undefined,
                url: `https://payments.example/checkout/${session.id}`
            }
        };
    };

    const confirmCheckoutSession = async (input: CheckoutConfirmRequest) => {
        const session = await repository.getCheckoutSessionById(input.sessionId);
        if (!session || session.completedAt) {
            throw new HttpError(404, 'checkout_not_found', 'Checkout session not found');
        }

        const now = Date.now();
        await repository.markCheckoutCompleted(session.id, now);

        const subscription = await repository.createSubscription({
            id: randomUUID(),
            memberId: session.memberId,
            priceId: session.priceId,
            status: 'active',
            createdAt: now,
            cancelledAt: null
        });

        await repository.createSubscriptionEvent({
            id: randomUUID(),
            memberId: session.memberId,
            subscriptionId: subscription.id,
            type: 'created',
            createdAt: now
        });

        let billingAccount = await repository.getBillingAccountByMember(session.memberId);
        if (!billingAccount) {
            billingAccount = await repository.createBillingAccount({
                id: randomUUID(),
                memberId: session.memberId,
                provider: 'stub',
                providerCustomerId: `cust_${session.memberId}`,
                createdAt: now,
                updatedAt: now
            });
        }

        await repository.createContentEntitlement({
            id: randomUUID(),
            memberId: session.memberId,
            source: 'subscription',
            sourceId: subscription.id,
            createdAt: now
        });

        if (session.offerId) {
            await repository.createOfferRedemption({
                id: randomUUID(),
                offerId: session.offerId,
                memberId: session.memberId,
                createdAt: now
            });
        }

        return {subscriptionId: subscription.id};
    };

    return {
        createPlan,
        createOffer,
        createCheckoutSession,
        confirmCheckoutSession
    };
};
