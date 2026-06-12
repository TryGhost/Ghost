import moment from 'moment-timezone';
import {getSymbol} from '@tryghost/admin-x-framework';
import type {MemberSubscription, MemberSubscriptionOffer} from '@tryghost/admin-x-framework/api/members';

/**
 * Port of the Ember admin's utils/subscription-data.js: pure presentation
 * logic for a member's subscriptions (status, validity, prices, offers).
 */

function getNonDecimal(amount: number): number {
    return amount / 100;
}

/** Port of the gh-price-amount helper (keeps trailing zeros on fractional prices). */
export function formatPriceAmount(amount: number, {cents = true}: {cents?: boolean} = {}): string {
    if (amount) {
        const price = cents ? amount / 100 : Math.round(amount / 100);
        if (price % 1 === 0) {
            return new Intl.NumberFormat('en-US').format(price);
        }
        return new Intl.NumberFormat('en-US', {minimumFractionDigits: 2}).format(Math.round(price * 100) / 100);
    }
    return '0';
}

export interface SubscriptionPriceData {
    currencySymbol: string;
    nonDecimalAmount: number;
    amount: number;
}

export interface SubscriptionData {
    sub: MemberSubscription;
    id: string;
    status: string;
    cancel_at_period_end: boolean;
    customer: MemberSubscription['customer'];
    offer: MemberSubscription['offer'];
    attribution: {
        referrerSource: string;
        referrerMedium: string;
    };
    startDate: string;
    validUntil: string;
    hasEnded: boolean;
    willEndSoon: boolean;
    cancellationReason: string | null;
    price: MemberSubscription['price'] & {
        currencySymbol: string;
        nonDecimalAmount: number;
    };
    isComplimentary: boolean;
    isGift: boolean;
    compExpiry: string | undefined;
    giftExpiry: string | undefined;
    trialUntil: string | undefined;
    priceLabel: string | undefined;
    validityDetails: string;
    hasActiveDiscount?: boolean;
    discountedPrice?: SubscriptionPriceData;
    originalPrice?: SubscriptionPriceData;
}

export function validUntil(sub: MemberSubscription): string {
    // If a subscription has been canceled immediately, don't render the end
    // of validity date (we don't store the exact cancellation date)
    if (sub.status === 'canceled' && !sub.cancel_at_period_end) {
        return '';
    }

    if (sub.current_period_end) {
        return moment(sub.current_period_end).format('D MMM YYYY');
    }

    return '';
}

export function isActive(sub: Pick<MemberSubscription, 'status'>): boolean {
    return ['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status);
}

export function isComplimentary(sub: MemberSubscription): boolean {
    const compedNickname = sub.plan?.nickname?.toLowerCase() === 'complimentary';

    return !sub.id && compedNickname;
}

export function isGift(sub: MemberSubscription): boolean {
    const giftNickname = sub.plan?.nickname?.toLowerCase() === 'gift subscription';

    return !sub.id && giftNickname;
}

export function isCanceled(sub: MemberSubscription): boolean {
    return sub.status === 'canceled';
}

export function isSetToCancel(sub: MemberSubscription): boolean {
    return sub.cancel_at_period_end && isActive(sub);
}

export function compExpiry(sub: MemberSubscription): string | undefined {
    if (!isComplimentary(sub)) {
        return undefined;
    }

    if (sub.tier && sub.tier.expiry_at) {
        return moment(sub.tier.expiry_at).utc().format('D MMM YYYY');
    }

    return undefined;
}

export function giftExpiry(sub: MemberSubscription): string | undefined {
    if (!isGift(sub)) {
        return undefined;
    }

    if (sub.tier && sub.tier.expiry_at) {
        return moment(sub.tier.expiry_at).utc().format('D MMM YYYY');
    }

    return undefined;
}

export function trialUntil(sub: MemberSubscription): string | undefined {
    const offer = sub.offer;
    const isTrial = !offer || offer?.type === 'trial';
    const isTrialActive = isTrial && sub.trial_end_at && moment(sub.trial_end_at).isAfter(new Date(), 'day');

    if (isTrialActive) {
        return moment(sub.trial_end_at).format('D MMM YYYY');
    }

    return undefined;
}

export function validityDetails(data: Pick<SubscriptionData, 'validUntil' | 'isComplimentary' | 'isGift' | 'compExpiry' | 'giftExpiry' | 'hasEnded' | 'willEndSoon' | 'trialUntil'>, separatorNeeded = false): string {
    const separator = separatorNeeded ? ' – ' : '';
    const space = data.validUntil ? ' ' : '';

    if (data.isComplimentary) {
        if (data.compExpiry) {
            return `${separator}Expires ${data.compExpiry}`;
        } else {
            return '';
        }
    }

    if (data.isGift) {
        if (data.giftExpiry) {
            return `${separator}Expires ${data.giftExpiry}`;
        } else {
            return '';
        }
    }

    if (data.hasEnded) {
        return `${separator}Ended${space}${data.validUntil}`;
    }

    if (data.willEndSoon) {
        return `${separator}Has access until${space}${data.validUntil}`;
    }

    if (data.trialUntil) {
        return `${separator}Ends ${data.trialUntil}`;
    }

    return `${separator}Renews${space}${data.validUntil}`;
}

export function priceLabel(data: Pick<SubscriptionData, 'trialUntil' | 'price'>): string | undefined {
    if (data.trialUntil) {
        return 'Free trial';
    }

    if (data.price.nickname && data.price.nickname.length > 0 && data.price.nickname !== 'Monthly' && data.price.nickname !== 'Yearly') {
        return data.price.nickname;
    }

    return undefined;
}

export function getOfferDisplayData(offer: MemberSubscriptionOffer, sub: Partial<MemberSubscription> = {}): {label: string; detail: string} {
    const isRetention = offer.redemption_type === 'retention';
    const label = isRetention ? 'Retention offer' : 'Signup offer';

    const isFreeMonths = offer.type === 'percent' && offer.amount === 100 && offer.duration === 'repeating';

    let discount;
    if (offer.type === 'trial') {
        discount = `${offer.amount} days free`;
    } else if (isFreeMonths) {
        discount = `${offer.duration_in_months} ${offer.duration_in_months === 1 ? 'month' : 'months'} free`;
    } else if (offer.type === 'fixed') {
        discount = `${getSymbol(offer.currency ?? '')}${getNonDecimal(offer.amount ?? 0)} off`;
    } else {
        discount = `${offer.amount}% off`;
    }

    let detail;
    if (isRetention) {
        const discountEnd = offer.id && sub.next_payment?.discount?.offer_id === offer.id
            ? sub.next_payment.discount.end
            : null;

        if (discountEnd) {
            detail = `${discount} until ${moment(discountEnd).format('MMM YYYY')}`;
        } else if (isFreeMonths) {
            // "N months free" is self-contained, no need to append "for N months"
            detail = discount;
        } else if (offer.duration === 'repeating' && offer.duration_in_months) {
            detail = `${discount} for ${offer.duration_in_months} ${offer.duration_in_months === 1 ? 'month' : 'months'}`;
        } else if (offer.duration === 'forever') {
            detail = `${discount} forever`;
        } else {
            detail = discount;
        }
    } else {
        detail = `${offer.name} (${discount})`;
    }

    return {label, detail};
}

export function getDiscountPrice(sub: MemberSubscription): {discountedPrice: SubscriptionPriceData; originalPrice: SubscriptionPriceData} | null {
    if (!sub.next_payment || !sub.next_payment.discount) {
        return null;
    }

    if (sub.next_payment.amount === sub.next_payment.original_amount) {
        return null;
    }

    return {
        discountedPrice: {
            currencySymbol: getSymbol(sub.next_payment.currency),
            nonDecimalAmount: getNonDecimal(sub.next_payment.amount),
            amount: sub.next_payment.amount
        },
        originalPrice: {
            currencySymbol: getSymbol(sub.next_payment.currency),
            nonDecimalAmount: getNonDecimal(sub.next_payment.original_amount ?? 0),
            amount: sub.next_payment.original_amount ?? 0
        }
    };
}

export function getSubscriptionData(sub: MemberSubscription): SubscriptionData {
    const data: SubscriptionData = {
        sub,
        id: sub.id,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        customer: sub.customer,
        offer: sub.offer,
        attribution: {
            referrerSource: sub.attribution?.referrer_source || 'Unknown',
            referrerMedium: sub.attribution?.referrer_medium || '-'
        },
        startDate: sub.start_date ? moment(sub.start_date).format('D MMM YYYY') : '-',
        validUntil: validUntil(sub),
        hasEnded: isCanceled(sub),
        willEndSoon: isSetToCancel(sub),
        cancellationReason: sub.cancellation_reason ?? null,
        price: {
            ...sub.price,
            currencySymbol: getSymbol(sub.price.currency),
            nonDecimalAmount: getNonDecimal(sub.price.amount)
        },
        isComplimentary: isComplimentary(sub),
        isGift: isGift(sub),
        compExpiry: compExpiry(sub),
        giftExpiry: giftExpiry(sub),
        trialUntil: trialUntil(sub),
        priceLabel: undefined,
        validityDetails: ''
    };

    data.priceLabel = priceLabel(data);
    data.validityDetails = validityDetails(data, !!data.priceLabel);

    const discount = getDiscountPrice(sub);
    if (discount) {
        data.hasActiveDiscount = true;
        data.discountedPrice = discount.discountedPrice;
        data.originalPrice = discount.originalPrice;
    }

    return data;
}

/**
 * Groups a member's subscriptions by tier for display, mirroring the `tiers`
 * getter in gh-member-settings-form.js. Tiers without any priced subscription
 * (pure complimentary) come back with an empty subscriptions array.
 */
export interface MemberTierGroup {
    id?: string;
    tier_id?: string;
    name?: string;
    subscriptions: SubscriptionData[];
}

type TierLike = {id?: string; tier_id?: string; name?: string};

export function groupSubscriptionsByTier(subscriptions: MemberSubscription[]): MemberTierGroup[] {
    const candidates = subscriptions
        .map(subscription => (subscription.tier || subscription.price?.tier) as TierLike | undefined);

    const tiers = candidates.filter((value, index, self): value is TierLike => {
        if (!value || typeof value.id === 'undefined') {
            return false;
        }
        // Deduplicate by taking the first object by id
        return self.findIndex(element => element && (element.tier_id || element.id) === (value.tier_id || value.id)) === index;
    });

    const subsWithPrice = subscriptions.filter(sub => !!sub.price);
    const subscriptionData = subsWithPrice.map(sub => getSubscriptionData(sub));

    return tiers.map((tier) => {
        const tierSubscriptions = subscriptionData.filter((subscription) => {
            return subscription.sub.price?.tier?.tier_id === (tier.tier_id || tier.id);
        });
        return {
            ...tier,
            subscriptions: tierSubscriptions
        };
    });
}

/** Stripe subscriptions that still bill (used by the delete-member dialog). */
export function hasActiveStripeSubscriptions(subscriptions: MemberSubscription[] | undefined): boolean {
    if (!subscriptions || subscriptions.length === 0) {
        return false;
    }

    return subscriptions.some(subscription => ['active', 'trialing', 'unpaid', 'past_due'].includes(subscription.status));
}

export function getActiveStripeSubscriptions(subscriptions: MemberSubscription[] | undefined): MemberSubscription[] {
    return (subscriptions ?? []).filter(subscription => ['active', 'trialing', 'unpaid', 'past_due'].includes(subscription.status));
}
