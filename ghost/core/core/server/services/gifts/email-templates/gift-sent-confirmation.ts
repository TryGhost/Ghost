import type {Translate} from '../gift-email-renderer';

export interface GiftSentConfirmationData {
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

export function renderText(data: GiftSentConfirmationData, t: Translate): string {
    return `${t('Your gift has been sent')}

${t('Your gift was sent to {recipientEmail}. You can also share the link below yourself.', {
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
