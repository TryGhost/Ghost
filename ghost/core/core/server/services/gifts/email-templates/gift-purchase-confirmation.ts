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
    };
}

export function renderText(data: GiftPurchaseConfirmationData, t: Translate): string {
    const intro = data.gift.recipientEmail
        ? t('Thank you for your support. Your gift — a {cadenceLabel} {tierName} membership to {siteTitle} — is on its way to {recipientEmail}. You can also share the link below yourself.', {
            cadenceLabel: data.gift.cadenceLabel,
            tierName: data.gift.tierName,
            siteTitle: data.siteTitle,
            recipientEmail: data.gift.recipientEmail,
            interpolation: {escapeValue: false}
        })
        : t('Thank you for your support. Share the link below with whoever you\'d like to gift them a {cadenceLabel} {tierName} membership to {siteTitle}.', {
        cadenceLabel: data.gift.cadenceLabel,
        tierName: data.gift.tierName,
        siteTitle: data.siteTitle,
        interpolation: {escapeValue: false}
    });
    const heading = data.gift.recipientEmail ? t('Your gift is on its way') : t('Your gift is ready');

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
