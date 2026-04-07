import errors from '@tryghost/errors';
import {Gift} from './gift';
import type {GiftBookshelfRepository} from './gift-bookshelf-repository';

interface MemberRepository {
    get(filter: Record<string, unknown>): Promise<{id: string} | null>;
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

    constructor({giftRepository, memberRepository}: {giftRepository: GiftBookshelfRepository; memberRepository: MemberRepository}) {
        this.#giftRepository = giftRepository;
        this.#memberRepository = memberRepository;
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

        return true;
    }
}
