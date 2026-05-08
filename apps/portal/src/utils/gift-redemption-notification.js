import {getMemberTierName, getSubscriptionExpiry} from './helpers';
import {t} from './i18n';

export function getGiftDurationLabel({cadence, duration} = {}) {
    if (cadence === 'year') {
        return duration === 1
            ? t('1 year')
            : t('{years} years', {years: duration});
    }

    return duration === 1
        ? t('1 month')
        : t('{months} months', {months: duration});
}

export function getGiftRedemptionSuccessMessage({member} = {}) {
    const tierName = getMemberTierName({member});
    const expiryDate = getSubscriptionExpiry({member});
    if (!tierName || !expiryDate) {
        return null;
    }
    // TODO: Add translation strings once copy has been finalised
    return `You now have access to ${tierName} until ${expiryDate}. Enjoy!`;
}

export function getGiftRedemptionErrorMessage(error) {
    let subtitle = t('Something went wrong, please try again later.');

    if (error?.code) {
        switch (error.code) {
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
    }

    return {
        title: t('Gift could not be redeemed'),
        subtitle
    };
}
