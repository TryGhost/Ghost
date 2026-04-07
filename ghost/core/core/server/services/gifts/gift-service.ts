import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import {Gift} from './gift';
import type {GiftBookshelfRepository} from './gift-bookshelf-repository';

interface MemberRepository {
    get(filter: Record<string, unknown>): Promise<{id: string; get(key: string): string | null} | null>;
}

interface StaffServiceEmails {
    notifyGiftReceived(data: {name: string | null; email: string; memberId: string | null; amount: number; currency: string}): Promise<void>;
}

interface GiftPurchaseData {
    token: string;
    buyerEmail: string;
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
    readonly #staffServiceEmails: StaffServiceEmails;

    constructor({giftRepository, memberRepository, staffServiceEmails}: {giftRepository: GiftBookshelfRepository; memberRepository: MemberRepository; staffServiceEmails: StaffServiceEmails}) {
        this.#giftRepository = giftRepository;
        this.#memberRepository = memberRepository;
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

        const member = await this.#memberRepository.get({email: data.buyerEmail});

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

        return true;
    }
}
