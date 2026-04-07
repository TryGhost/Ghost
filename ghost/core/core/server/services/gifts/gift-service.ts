import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import {Gift} from './gift';
import type {GiftBookshelfRepository} from './gift-bookshelf-repository';

interface MemberRepository {
    get(filter: Record<string, unknown>): Promise<{id: string; get(key: string): string | null} | null>;
}

interface TiersService {
    api: {
        read(idString: string): Promise<{name: string} | null>;
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
    }): Promise<void>;
}

interface GiftPurchaseData {
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

export class GiftService {
    readonly #giftRepository: GiftBookshelfRepository;
    readonly #memberRepository: MemberRepository;
    readonly #tiersService: TiersService;
    readonly #giftEmailService: GiftEmailService;
    readonly #staffServiceEmails: StaffServiceEmails;

    constructor({giftRepository, memberRepository, tiersService, giftEmailService, staffServiceEmails}: {giftRepository: GiftBookshelfRepository; memberRepository: MemberRepository; tiersService: TiersService; giftEmailService: GiftEmailService; staffServiceEmails: StaffServiceEmails}) {
        this.#giftRepository = giftRepository;
        this.#memberRepository = memberRepository;
        this.#tiersService = tiersService;
        this.#giftEmailService = giftEmailService;
        this.#staffServiceEmails = staffServiceEmails;
    }

    async recordPurchase(data: GiftPurchaseData): Promise<boolean> {
        const duration = Number.parseInt(data.duration);

        if (Number.isNaN(duration)) {
            throw new errors.ValidationError({message: `Invalid gift duration: ${data.duration}`});
        }

        if (await this.#giftRepository.existsByCheckoutSessionId(data.stripeCheckoutSessionId)) {
            return false;
        }

        const member = data.stripeCustomerId
            ? await this.#memberRepository.get({customer_id: data.stripeCustomerId})
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

        await this.#giftRepository.create(gift);

        try {
            await this.#staffServiceEmails.notifyGiftReceived({
                name: member?.get('name') ?? null,
                email: member?.get('email') ?? data.buyerEmail,
                memberId: member?.id ?? null,
                amount: data.amount,
                currency: data.currency
            });
        } catch (err) {
            logging.error(err);
        }

        try {
            const tier = await this.#tiersService.api.read(data.tierId);

            if (!tier) {
                throw new errors.NotFoundError({message: `Tier not found: ${data.tierId}`});
            }

            if (!gift.expiresAt) {
                throw new errors.InternalServerError({message: 'Gift is missing expiration date'});
            }

            await this.#giftEmailService.sendPurchaseConfirmation({
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
            logging.error(err);
        }

        return true;
    }
}
