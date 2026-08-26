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
        duration: number;
        isMonthly: boolean;
        link: string;
        expiresAt: string;
        recipientEmail: string | null;
    };
}

export function renderText(data: GiftPurchaseConfirmationData, t: Translate): string {
    const giftDescription = {
        duration: data.gift.duration,
        count: data.gift.duration,
        tierName: data.gift.tierName,
        siteTitle: data.siteTitle,
        interpolation: {escapeValue: false}
    };
    const intro = data.gift.recipientEmail
        ? data.gift.isMonthly
            ? t('Thank you for your support. Your gift — a {duration}-month {tierName} membership to {siteTitle} — is on its way to {recipientEmail}. You can also share the link below yourself.', {
                ...giftDescription,
                recipientEmail: data.gift.recipientEmail
            })
            : t('Thank you for your support. Your gift — a {duration}-year {tierName} membership to {siteTitle} — is on its way to {recipientEmail}. You can also share the link below yourself.', {
                ...giftDescription,
                recipientEmail: data.gift.recipientEmail
            })
        : data.gift.isMonthly
            ? t('Thank you for your support. Share the link below with whoever you\'d like to gift them a {duration}-month {tierName} membership to {siteTitle}.', giftDescription)
            : t('Thank you for your support. Share the link below with whoever you\'d like to gift them a {duration}-year {tierName} membership to {siteTitle}.', giftDescription);
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
