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
    const intro = `${t('Thank you for supporting {siteTitle}.', {
        siteTitle: data.siteTitle,
        interpolation: {escapeValue: false}
    })} ${t('Share the link below to give someone access to {tierName} membership for {cadenceLabel}.', {
        tierName: data.gift.tierName,
        cadenceLabel: data.gift.cadenceLabel,
        interpolation: {escapeValue: false}
    })}`;

    return `${t('Your gift is ready')}

${intro}

${data.gift.link}

${t('The link can be redeemed once and expires on {expiresAt}.', {
        expiresAt: data.gift.expiresAt,
        interpolation: {escapeValue: false}
    })}

${t('Happy gifting.')}

---
${t('This message was sent from {siteDomain} to {email}.', {
        siteDomain: data.siteDomain,
        email: data.toEmail,
        interpolation: {escapeValue: false}
    })}`;
}
