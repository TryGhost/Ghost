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
    };
}

export function renderText(data: GiftPurchaseConfirmationData, t: Translate): string {
    const intro = t('Thank you for your support. Share the link below with whoever you\'d like to gift them a {cadenceLabel} {tierName} membership to {siteTitle}.', {
        cadenceLabel: data.gift.cadenceLabel,
        tierName: data.gift.tierName,
        siteTitle: data.siteTitle,
        interpolation: {escapeValue: false}
    });

    return `${t('Your gift is ready')}

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
