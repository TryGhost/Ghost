import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import {Gift} from './gift';
import type {GiftRepository} from './gift-repository';
import tpl from '@tryghost/tpl';

const errorMessages = {
    giftSubscriptionsNotEnabled: 'Gift subscriptions are not enabled on this site.',
    giftNotFound: 'This gift does not exist.',
    giftAlreadyRedeemed: 'This gift has already been redeemed.',
    giftConsumed: 'This gift has already been consumed.',
    giftExpired: 'This gift has expired.',
    giftRefunded: 'This gift has been refunded.',
    paidMember: 'You already have an active subscription.'
};

interface MemberRepository {
    get(filter: Record<string, unknown>, options?: Record<string, unknown>): Promise<{id: string; get(key: string): string | null} | null>;
    update(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
}

type Tier = {
    name: string;
    toJSON?: () => {
        id: string;
        name: string;
        description: string | null;
        benefits: string[];
    };
};

interface TiersService {
    api: {
        read(idString: string): Promise<Tier | null>;
    };
}

interface GiftEmailService {
    sendPurchaseConfirmation(data: {
        buyerEmail: string;
        amount: number;
        currency: string;
        token: string;
        tierName: string;
        cadence: 'month' | 'year';
        duration: number;
        expiresAt: Date;
    }): Promise<void>;
}

interface StaffServiceEmails {
    notifyGiftReceived(data: {
        name: string | null;
        email: string;
        memberId: string | null;
        amount: number;
        currency: string;
        tierName: string;
        cadence: 'month' | 'year';
        duration: number;
    }): Promise<void>;
}

export interface GiftPurchaseData {
    token: string;
    buyerEmail: string;
    stripeCustomerId: string | null;
    tierId: string;
    cadence: 'month' | 'year';
    duration: string;
    currency: string;
    amount: number;
    stripeCheckoutSessionId: string;
    stripePaymentIntentId: string;
}

interface GiftServiceDeps {
    giftRepository: GiftRepository;
    memberRepository: MemberRepository;
    tiersService: TiersService;
    giftEmailService: GiftEmailService;
    staffServiceEmails: StaffServiceEmails;
}

export class GiftService {
    private readonly deps: GiftServiceDeps;

    constructor(deps: GiftServiceDeps) {
        this.deps = deps;
    }

    async recordPurchase(data: GiftPurchaseData): Promise<boolean> {
        const duration = Number.parseInt(data.duration);

        if (Number.isNaN(duration)) {
            throw new errors.ValidationError({message: `Invalid gift duration: ${data.duration}`});
        }

        if (await this.deps.giftRepository.existsByCheckoutSessionId(data.stripeCheckoutSessionId)) {
            return false;
        }

        const member = data.stripeCustomerId
            ? await this.deps.memberRepository.get({customer_id: data.stripeCustomerId})
            : null;

        const gift = Gift.fromPurchase({
            token: data.token,
            buyerEmail: data.buyerEmail,
            buyerMemberId: member?.id ?? null,
            tierId: data.tierId,
            cadence: data.cadence,
            duration,
            currency: data.currency,
            amount: data.amount,
            stripeCheckoutSessionId: data.stripeCheckoutSessionId,
            stripePaymentIntentId: data.stripePaymentIntentId
        });

        await this.deps.giftRepository.create(gift);

        const tier = await this.deps.tiersService.api.read(data.tierId);

        if (!tier) {
            throw new errors.NotFoundError({message: `Tier not found: ${data.tierId}`});
        }

        try {
            await this.deps.staffServiceEmails.notifyGiftReceived({
                name: member?.get('name') ?? null,
                email: member?.get('email') ?? data.buyerEmail,
                memberId: member?.id ?? null,
                amount: data.amount,
                currency: data.currency,
                tierName: tier.name,
                cadence: data.cadence,
                duration
            });
        } catch (err) {
            logging.error('Failed to notify staff of gift purchase', err);
        }

        try {
            await this.deps.giftEmailService.sendPurchaseConfirmation({
                buyerEmail: data.buyerEmail,
                amount: data.amount,
                currency: data.currency,
                token: data.token,
                tierName: tier.name,
                cadence: data.cadence,
                duration,
                expiresAt: gift.expiresAt
            });
        } catch (err) {
            logging.error('Failed to send gift purchase confirmation email', err);
        }

        return true;
    }

    async getByToken(token: string): Promise<Gift> {
        const gift = await this.deps.giftRepository.getByToken(token);

        if (!gift) {
            throw new errors.NotFoundError({
                message: tpl(errorMessages.giftNotFound)
            });
        }

        return gift;
    }

    async assertRedeemable(gift: Gift, memberStatus: string | null): Promise<Gift> {
        const redeemableCheck = gift.checkRedeemable(memberStatus);

        if (!redeemableCheck.redeemable) {
            switch (redeemableCheck.reason) {
            case 'redeemed':
                throw new errors.BadRequestError({
                    message: tpl(errorMessages.giftAlreadyRedeemed)
                });
            case 'consumed':
                throw new errors.BadRequestError({
                    message: tpl(errorMessages.giftConsumed)
                });
            case 'expired':
                throw new errors.BadRequestError({
                    message: tpl(errorMessages.giftExpired)
                });
            case 'refunded':
                throw new errors.BadRequestError({
                    message: tpl(errorMessages.giftRefunded)
                });
            case 'paid-member':
                throw new errors.BadRequestError({
                    message: tpl(errorMessages.paidMember)
                });
            default: {
                const exhaustiveCheck: never = redeemableCheck.reason;

                throw new errors.InternalServerError({
                    message: `Unhandled redeem failure reason: ${exhaustiveCheck}`
                });
            }
            }
        }

        return gift;
    }

    async getRedeemable(token: string, memberStatus: string | null): Promise<Gift> {
        const gift = await this.deps.giftRepository.getByToken(token);

        if (!gift) {
            throw new errors.NotFoundError({message: tpl(errorMessages.giftNotFound)});
        }

        await this.assertRedeemable(gift, memberStatus);

        return gift;
    }

    async redeem({token, memberId}: {token: string; memberId: string}): Promise<Gift> {
        return await this.deps.giftRepository.transaction(async (transacting) => {
            const member = await this.deps.memberRepository.get({id: memberId}, {transacting, forUpdate: true});

            if (!member) {
                throw new errors.NotFoundError({message: `Member not found: ${memberId}`});
            }

            const gift = await this.deps.giftRepository.getByToken(token, {transacting, forUpdate: true});

            if (!gift) {
                throw new errors.NotFoundError({message: tpl(errorMessages.giftNotFound)});
            }

            await this.assertRedeemable(gift, member.get('status'));

            const redeemed = gift.redeem({memberId});

            await this.deps.memberRepository.update({
                products: [{
                    id: redeemed.tierId,
                    expiry_at: redeemed.consumesAt
                }],
                status: 'gift'
            }, {id: memberId, transacting});

            await this.deps.giftRepository.update(redeemed, {transacting});

            return redeemed;
        });
    }

    async refund(paymentIntentId: string): Promise<boolean> {
        const gift = await this.deps.giftRepository.getByPaymentIntentId(paymentIntentId);

        if (!gift) {
            return false;
        }

        const refunded = gift.refund();

        if (!refunded) {
            return true;
        }

        await this.deps.giftRepository.transaction(async (transacting) => {
            await this.deps.giftRepository.update(refunded, {transacting});

            if (gift.redeemerMemberId) {
                const member = await this.deps.memberRepository.get({id: gift.redeemerMemberId}, {transacting});

                if (member?.get('status') === 'gift') {
                    await this.deps.memberRepository.update({
                        products: [],
                        status: 'free'
                    }, {id: gift.redeemerMemberId, transacting});
                }
            }
        });

        return true;
    }

    async processConsumed(): Promise<{consumedCount: number; updatedMemberCount: number}> {
        const toConsume = await this.deps.giftRepository.findPendingConsumption();

        if (toConsume.length === 0) {
            return {consumedCount: 0, updatedMemberCount: 0};
        }

        let consumedCount = 0;
        let updatedMemberCount = 0;

        for (const gift of toConsume) {
            const consumed = gift.consume();

            if (!consumed) {
                continue;
            }

            await this.deps.giftRepository.transaction(async (transacting) => {
                const member = await this.deps.memberRepository.get({id: gift.redeemerMemberId}, {transacting});

                if (member && member.get('status') === 'gift') {
                    await this.deps.memberRepository.update({
                        products: [],
                        status: 'free'
                    }, {id: gift.redeemerMemberId, transacting});

                    updatedMemberCount += 1;
                }

                await this.deps.giftRepository.update(consumed, {transacting});
            });

            consumedCount += 1;
        }

        return {consumedCount, updatedMemberCount};
    }
}
