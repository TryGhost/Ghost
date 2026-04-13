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

export function getGiftRedemptionErrorMessage(error) {
    const subtitle = error?.message && error.message !== 'Failed to load gift data'
        ? error.message
        : 'Gift link is not valid'; // TODO: Add translation strings once copy has been finalised

    return {
        title: 'Gift could not be redeemed', // TODO: Add translation strings once copy has been finalised
        subtitle
    };
}
