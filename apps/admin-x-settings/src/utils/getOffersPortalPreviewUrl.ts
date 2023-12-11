export type offerPortalPreviewUrlTypes = {
    disableBackground?: boolean;
    name: string;
    code: string;
    displayTitle: string;
    displayDescription: string;
    type: string;
    cadence: string;
    amount: number;
    duration: string;
    durationInMonths: number;
    currency: string;
    status: string;
    tierId: string;
};

export const getOfferPortalPreviewUrl = (overrides:offerPortalPreviewUrlTypes, baseUrl: string) : string => {
    const {
        disableBackground = false,
        name,
        code,
        displayTitle = '',
        displayDescription = '',
        type,
        cadence,
        amount = 0,
        duration,
        durationInMonths,
        currency = 'usd',
        status,
        tierId
    } = overrides;

    baseUrl = baseUrl.replace(/\/$/, '');
    const portalBase = '/?v=modal-portal-offer#/portal/preview/offer';
    const settingsParam = new URLSearchParams();

    settingsParam.append('disableBackground', 'false');
    settingsParam.append('name', encodeURIComponent(name));
    settingsParam.append('code', encodeURIComponent(code));
    settingsParam.append('display_title', encodeURIComponent(displayTitle));
    settingsParam.append('display_description', encodeURIComponent(displayDescription));
    settingsParam.append('type', encodeURIComponent(type));
    settingsParam.append('cadence', encodeURIComponent(cadence));
    settingsParam.append('amount', encodeURIComponent(amount));
    settingsParam.append('duration', encodeURIComponent(duration));
    settingsParam.append('duration_in_months', encodeURIComponent(durationInMonths));
    settingsParam.append('currency', encodeURIComponent(currency));
    settingsParam.append('status', encodeURIComponent(status));
    settingsParam.append('tier_id', encodeURIComponent(tierId));

    if (disableBackground) {
        settingsParam.append('disableBackground', 'true');
    }

    return `${baseUrl}${portalBase}?${settingsParam.toString()}`;
};
