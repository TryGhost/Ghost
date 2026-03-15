import moment from 'moment-timezone';
import {getNonDecimal, getSymbol} from 'ghost-admin/utils/currency';

export function getSubscriptionData(sub) {
    const data = {
        ...sub,
        attribution: {
            ...sub.attribution,
            referrerSource: sub.attribution?.referrer_source || 'Unknown',
            referrerMedium: sub.attribution?.referrer_medium || '-'
        },
        startDate: sub.start_date ? moment(sub.start_date).format('D MMM YYYY') : '-',
        validUntil: validUntil(sub),
        hasEnded: isCanceled(sub),
        willEndSoon: isSetToCancel(sub),
        cancellationReason: sub.cancellation_reason,
        price: {
            ...sub.price,
            currencySymbol: getSymbol(sub.price.currency),
            nonDecimalAmount: getNonDecimal(sub.price.amount)
        },
        isComplimentary: isComplimentary(sub),
        compExpiry: compExpiry(sub),
        trialUntil: trialUntil(sub)
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

export function validUntil(sub) {
    // If a subscription has been canceled immediately, don't render the end of validity date
    // Reason: we don't store the exact cancelation date in the subscription object
    if (sub.status === 'canceled' && !sub.cancel_at_period_end) {
        return '';
    }

    // Otherwise, show the current period end date
    if (sub.current_period_end) {
        return moment(sub.current_period_end).format('D MMM YYYY');
    }

    return '';
}

export function isActive(sub) {
    return ['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status);
}

export function isComplimentary(sub) {
    return !sub.id;
}

export function isCanceled(sub) {
    return sub.status === 'canceled';
}

export function isSetToCancel(sub) {
    return sub.cancel_at_period_end && isActive(sub);
}

export function compExpiry(sub) {
    if (!sub.id && sub.tier && sub.tier.expiry_at) {
        return moment(sub.tier.expiry_at).utc().format('D MMM YYYY');
    }

    return undefined;
}

export function trialUntil(sub) {
    const offer = sub.offer;
    const isTrial = !offer || offer?.type === 'trial';
    const isTrialActive = isTrial && sub.trial_end_at && moment(sub.trial_end_at).isAfter(new Date(), 'day');

    if (isTrialActive) {
        return moment(sub.trial_end_at).format('D MMM YYYY');
    }

    return undefined;
}

export function validityDetails(data, separatorNeeded = false) {
    const separator = separatorNeeded ? ' – ' : '';
    const space = data.validUntil ? ' ' : '';

    if (data.isComplimentary) {
        if (data.compExpiry) {
            return `${separator}Expires ${data.compExpiry}`;
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

export function priceLabel(data) {
    if (data.trialUntil) {
        return 'Free trial';
    }

    if (data.price.nickname && data.price.nickname.length > 0 && data.price.nickname !== 'Monthly' && data.price.nickname !== 'Yearly') {
        return data.price.nickname;
    }
}

export function getOfferDisplayData(offer, sub = {}) {
    const isRetention = offer.redemption_type === 'retention';
    const label = isRetention ? 'Retention offer' : 'Signup offer';

    const isFreeMonths = offer.type === 'percent' && offer.amount === 100 && offer.duration === 'repeating';

    let discount;
    if (offer.type === 'trial') {
        discount = `${offer.amount} days free`;
    } else if (isFreeMonths) {
        discount = `${offer.duration_in_months} ${offer.duration_in_months === 1 ? 'month' : 'months'} free`;
    } else if (offer.type === 'fixed') {
        discount = `${getSymbol(offer.currency)}${getNonDecimal(offer.amount)} off`;
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

export function getDiscountPrice(sub) {
    if (!sub.next_payment || !sub.next_payment.discount) {
        return null;
    }

    if (sub.next_payment.amount === sub.next_payment.original_amount) {
        return null;
    }

    return {
        discountedPrice: {
            currencySymbol: getSymbol(sub.next_payment.currency),
            nonDecimalAmount: getNonDecimal(sub.next_payment.amount)
        },
        originalPrice: {
            currencySymbol: getSymbol(sub.next_payment.currency),
            nonDecimalAmount: getNonDecimal(sub.next_payment.original_amount)
        }
    };
}
