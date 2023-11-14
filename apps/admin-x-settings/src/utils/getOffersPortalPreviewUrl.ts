export type offerPortalPreviewUrlTypes = {
    disableBackground?: boolean;
    name: string;
    code: {
        isDirty?: boolean;
        value: string;
    }
    displayTitle: {
        isDirty?: boolean;
        value: string;
    }
    displayDescription?: string;
    type: string;
    cadence: string;
    trialAmount?: number;
    discountAmount?: number;
    percentageOff?: number;
    duration: string;
    durationInMonths: number;
    currency?: string;
    status: string;
    tierId: string;
    amountType?: string;
};

export const getOfferPortalPreviewUrl = (overrides:offerPortalPreviewUrlTypes, baseUrl: string) : string => {
    const {
        disableBackground = false,
        name,
        code = {
            isDirty: false,
            value: ''
        },
        displayTitle = {
            isDirty: false,
            value: ''
        },
        displayDescription = '',
        type,
        cadence,
        trialAmount = 7,
        discountAmount = 0,
        amountType,
        duration,
        durationInMonths,
        currency = 'usd',
        status,
        tierId
    } = overrides;

    const portalBase = '/#/portal/preview/offer';
    const settingsParam = new URLSearchParams();

    settingsParam.append('type', encodeURIComponent(type));

    const getDiscountAmount = (discount: number, dctype: string) => {
        if (dctype === 'percentageOff') {
            return discount.toString();
        }
        if (dctype === 'currencyOff') {
            settingsParam.append('type', encodeURIComponent('fixed'));
            let calcDiscount = discount * 100;
            return calcDiscount.toString();
        }
    };

    settingsParam.append('name', encodeURIComponent(name));
    settingsParam.append('code', encodeURIComponent(code.value));
    settingsParam.append('display_title', encodeURIComponent(displayTitle.value));
    settingsParam.append('display_description', encodeURIComponent(displayDescription));
    settingsParam.append('cadence', encodeURIComponent(cadence));
    settingsParam.append('duration', encodeURIComponent(duration));
    settingsParam.append('duration_in_months', encodeURIComponent(durationInMonths));
    settingsParam.append('currency', encodeURIComponent(currency));
    settingsParam.append('status', encodeURIComponent(status));
    settingsParam.append('tier_id', encodeURIComponent(tierId));
    settingsParam.append('amount', encodeURIComponent(type === 'trial' ? trialAmount.toString() : getDiscountAmount(discountAmount, amountType ? amountType : 'currencyOff') || '0'));

    if (disableBackground) {
        settingsParam.append('disableBackground', 'true');
    }

    return `${baseUrl}${portalBase}?${settingsParam.toString()}`;
};
