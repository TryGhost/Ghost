import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import tpl from '@tryghost/tpl';
import {Gift} from './gift';
import type {GiftRepository} from './gift-repository';
import ObjectID from 'bson-objectid';

interface MemberRepository {
    get(filter: Record<string, unknown>): Promise<{id: string; get(key: string): string | null} | null>;
}

type Tier = {
    id: ObjectID;
    name: string;
    description: string | null;
    benefits: string[] | null;
    toJSON?: () => {
        id: string;
        name: string;
        description: string | null;
        benefits: string[] | null;
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

interface LabsService {
    isSet(key: string): boolean;
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

const messages = {
    giftSubscriptionsNotEnabled: 'Gift subscriptions are not enabled on this site.',
    giftNotFound: 'Gift not found.',
    giftAlreadyRedeemed: 'This gift has already been redeemed.',
    giftConsumed: 'This gift has already been consumed.',
    giftExpired: 'This gift has expired.',
    giftRefunded: 'This gift has been refunded.',
    memberAlreadySubscribed: 'You already have an active subscription.'
};

export class GiftService {
    private readonly giftRepository: GiftRepository;
    private readonly memberRepository: MemberRepository;
    private readonly tiersService: TiersService;
    private readonly giftEmailService: GiftEmailService;
    private readonly staffServiceEmails: StaffServiceEmails;
    private readonly labsService: LabsService;

    constructor({giftRepository, memberRepository, tiersService, giftEmailService, staffServiceEmails, labsService}: {giftRepository: GiftRepository; memberRepository: MemberRepository; tiersService: TiersService; giftEmailService: GiftEmailService; staffServiceEmails: StaffServiceEmails; labsService: LabsService}) {
        this.giftRepository = giftRepository;
        this.memberRepository = memberRepository;
        this.tiersService = tiersService;
        this.giftEmailService = giftEmailService;
        this.staffServiceEmails = staffServiceEmails;
        this.labsService = labsService;
    }

    async recordPurchase(data: GiftPurchaseData): Promise<boolean> {
        const duration = Number.parseInt(data.duration);

        if (Number.isNaN(duration)) {
            throw new errors.ValidationError({message: `Invalid gift duration: ${data.duration}`});
        }

        if (await this.giftRepository.existsByCheckoutSessionId(data.stripeCheckoutSessionId)) {
            return false;
        }

        const member = data.stripeCustomerId
            ? await this.memberRepository.get({customer_id: data.stripeCustomerId})
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

        await this.giftRepository.create(gift);

        const tier = await this.tiersService.api.read(data.tierId);

        if (!tier) {
            throw new errors.NotFoundError({message: `Tier not found: ${data.tierId}`});
        }

        try {
            await this.staffServiceEmails.notifyGiftReceived({
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
            await this.giftEmailService.sendPurchaseConfirmation({
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

    async getRedeemableGiftByToken({token, currentMember}: {token: string; currentMember?: {status: string} | null}) {
        if (!this.labsService.isSet('giftSubscriptions')) {
            throw new errors.BadRequestError({
                message: tpl(messages.giftSubscriptionsNotEnabled)
            });
        }

        const gift = await this.giftRepository.getByToken(token);

        if (!gift) {
            throw new errors.NotFoundError({
                message: tpl(messages.giftNotFound)
            });
        }

        const redeemableCheck = gift.checkRedeemable();

        if (!redeemableCheck.redeemable) {
            switch (redeemableCheck.reason) {
            case 'redeemed':
                throw new errors.BadRequestError({
                    message: tpl(messages.giftAlreadyRedeemed)
                });
            case 'consumed':
                throw new errors.BadRequestError({
                    message: tpl(messages.giftConsumed)
                });
            case 'expired':
                throw new errors.BadRequestError({
                    message: tpl(messages.giftExpired)
                });
            case 'refunded':
                throw new errors.BadRequestError({
                    message: tpl(messages.giftRefunded)
                });
            default: {
                const exhaustiveCheck: never = redeemableCheck.reason;

                throw new errors.InternalServerError({
                    message: `Unhandled redeem failure reason: ${exhaustiveCheck}`
                });
            }
            }
        }

        if (currentMember && currentMember.status !== 'free') {
            throw new errors.BadRequestError({
                message: tpl(messages.memberAlreadySubscribed)
            });
        }

        const tier = await this.tiersService.api.read(gift.tierId);

        if (!tier) {
            throw new errors.NotFoundError({
                message: tpl(messages.giftNotFound)
            });
        }

        const tierJSON = tier.toJSON ? tier.toJSON() : tier;

        return {
            token: gift.token,
            cadence: gift.cadence,
            duration: gift.duration,
            currency: gift.currency,
            amount: gift.amount,
            expires_at: gift.expiresAt,
            tier: {
                id: tierJSON.id,
                name: tierJSON.name,
                description: tierJSON.description ?? null,
                benefits: Array.isArray(tierJSON.benefits) ? tierJSON.benefits : []
            }
        };
    }
}
