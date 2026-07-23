import type {Translate} from '../gift-email-renderer';

export interface GiftPurchaseConfirmationData {
    siteTitle: string;
    siteUrl: string;
    siteIconUrl: string | null;
    siteDomain: string;
    accentColor: string | undefined;
    toEmail: string;
    gift: {
        tierName: string;
        cadenceLabel: string;
        link: string;
        expiresAt: string;
        recipientEmail: string | null;
        deliverAt: string | null;
    };
}

export function renderText(data: GiftPurchaseConfirmationData, t: Translate): string {
    let heading;
    let intro;

    if (data.gift.recipientEmail && data.gift.deliverAt) {
        heading = t('Your gift is scheduled');
        intro = t('Thank you for your support. Your gift — a {cadenceLabel} {tierName} membership to {siteTitle} — will be delivered to {recipientEmail} on {deliverAt}. You can also share the link below yourself.', {
            cadenceLabel: data.gift.cadenceLabel,
            tierName: data.gift.tierName,
            siteTitle: data.siteTitle,
            recipientEmail: data.gift.recipientEmail,
            deliverAt: data.gift.deliverAt,
            interpolation: {escapeValue: false}
        });
    } else if (data.gift.recipientEmail) {
        heading = t('Your gift is on its way');
        intro = t('Thank you for your support. Your gift — a {cadenceLabel} {tierName} membership to {siteTitle} — has been sent to {recipientEmail}. You can also share the link below yourself.', {
            cadenceLabel: data.gift.cadenceLabel,
            tierName: data.gift.tierName,
            siteTitle: data.siteTitle,
            recipientEmail: data.gift.recipientEmail,
            interpolation: {escapeValue: false}
        });
    } else {
        heading = t('Your gift is ready');
        intro = t('Thank you for your support. Share the link below with whoever you\'d like to gift them a {cadenceLabel} {tierName} membership to {siteTitle}.', {
            cadenceLabel: data.gift.cadenceLabel,
            tierName: data.gift.tierName,
            siteTitle: data.siteTitle,
            interpolation: {escapeValue: false}
        });
    }

    return `${heading}

${intro}

${data.gift.link}

${t('The link expires on {expiresAt} and can only be redeemed once.', {
        expiresAt: data.gift.expiresAt,
        interpolation: {escapeValue: false}
    })}

---
${t('This message was sent from {siteDomain} to {email}.', {
        siteDomain: data.siteDomain,
        email: data.toEmail,
        interpolation: {escapeValue: false}
    })}`;
}
