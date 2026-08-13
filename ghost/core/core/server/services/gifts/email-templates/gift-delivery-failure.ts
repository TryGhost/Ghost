import type {Translate} from '../gift-email-renderer';

export interface GiftDeliveryFailureData {
    siteTitle: string;
    siteUrl: string;
    siteIconUrl: string | null;
    siteDomain: string;
    toEmail: string;
    gift: {
        link: string;
        expiresAt: string;
        recipientEmail: string;
    };
}

export function renderText(data: GiftDeliveryFailureData, t: Translate): string {
    return `${t('We couldn\'t deliver your gift')}

${t('We couldn\'t deliver your gift to {recipientEmail}. Send them the gift link below so they can redeem it.', {
        recipientEmail: data.gift.recipientEmail,
        interpolation: {escapeValue: false}
    })}

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
