/**
 * Gift redemption messaging, ported from Portal's gift-redemption-notification.js.
 * Lives in shared/ because both the shell (boot notification) and the gift
 * feature consume it.
 */

import type {Translator} from '../types';
import type {MemberRecord, Subscription} from './api-client';
import {formatDate} from './pricing';

export function getGiftDurationLabel({cadence, duration}: {cadence: 'month' | 'year'; duration: number}, t: Translator): string {
    if (cadence === 'year') {
        return duration === 1 ? t('1 year') : t('{years} years', {years: duration});
    }
    return duration === 1 ? t('1 month') : t('{months} months', {months: duration});
}

function getActiveSubscription(record: MemberRecord | null): Subscription | undefined {
    return record?.subscriptions?.find(sub => ['active', 'trialing', 'unpaid', 'past_due'].includes(sub.status));
}

/** "You now have access to {tier} until {date}" — null when the record lacks the data. */
export function getGiftRedemptionSuccessMessage(record: MemberRecord | null, t: Translator, locale = 'en'): string | null {
    const subscription = getActiveSubscription(record);
    const tierName = subscription?.tier?.name;
    const expiryDate = subscription?.tier?.expiry_at ? formatDate(subscription.tier.expiry_at, locale) : '';
    if (!tierName || !expiryDate) {
        return null;
    }
    return t('You now have access to {tierName} until {expiryDate}. Enjoy!', {tierName, expiryDate});
}

export function getGiftRedemptionErrorMessage(code: string | null | undefined, t: Translator): {title: string; subtitle: string} {
    let subtitle = t('Something went wrong, please try again later.');

    switch (code) {
    case 'GIFT_REDEEMED':
        subtitle = t('This gift has already been redeemed.');
        break;
    case 'GIFT_CONSUMED':
        subtitle = t('This gift has already been consumed.');
        break;
    case 'GIFT_EXPIRED':
        subtitle = t('This gift has expired.');
        break;
    case 'GIFT_REFUNDED':
        subtitle = t('This gift has been refunded.');
        break;
    case 'GIFT_PAID_MEMBER':
        subtitle = t('You already have an active subscription.');
        break;
    case 'TOKEN_EXPIRED':
        subtitle = t('Email confirmation link expired.');
        break;
    }

    return {
        title: t('Gift could not be redeemed'),
        subtitle
    };
}
