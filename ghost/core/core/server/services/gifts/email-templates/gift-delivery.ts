import type {Translate} from '../gift-email-renderer';

export interface GiftDeliveryData {
    siteTitle: string;
    siteUrl: string;
    siteIconUrl: string | null;
    siteDomain: string;
    accentColor: string;
    accentTint: string;
    accentShade: string;
    toEmail: string;
    buyerName: string | null;
    recipientName: string | null;
    personalMessage: string | null;
    gift: {
        tierName: string;
        benefits: string[];
        duration: number;
        isMonthly: boolean;
        link: string;
        expiresAt: string;
    };
}

export function renderText(data: GiftDeliveryData, t: Translate): string {
    const interpolation = {escapeValue: false};
    const greeting = data.recipientName ? `${t('Hi {recipientName},', {
        recipientName: data.recipientName,
        interpolation
    })}\n\n` : '';
    const giftDescription = {
        duration: data.gift.duration,
        tierName: data.gift.tierName,
        siteTitle: data.siteTitle
    };
    const intro = data.gift.isMonthly
        ? data.buyerName
            ? t('{buyerName} has gifted you a {duration}-month {tierName} membership to {siteTitle}', {
                ...giftDescription,
                buyerName: data.buyerName,
                count: data.gift.duration,
                interpolation
            })
            : t('You\'ve been gifted a {duration}-month {tierName} membership to {siteTitle}', {
                ...giftDescription,
                count: data.gift.duration,
                interpolation
            })
        : data.buyerName
            ? t('{buyerName} has gifted you a {duration}-year {tierName} membership to {siteTitle}', {
                ...giftDescription,
                buyerName: data.buyerName,
                interpolation
            })
            : t('You\'ve been gifted a {duration}-year {tierName} membership to {siteTitle}', {
                ...giftDescription,
                interpolation
            });
    const message = data.personalMessage ? `\n"${data.personalMessage}"${data.buyerName ? `\n— ${data.buyerName}` : ''}\n` : '';
    const benefits = data.gift.benefits.length ? `\n${t('What\'s included:')}\n${data.gift.benefits.map(benefit => `- ${benefit}`).join('\n')}\n` : '';

    return `${t('A gift, just for you')}\n\n${greeting}${intro}\n${message}${benefits}\n${t('Redeem your gift')}:\n${data.gift.link}\n\n${t('This gift can only be redeemed once and expires on {expiresAt}.', {
        expiresAt: data.gift.expiresAt,
        interpolation
    })}\n\n---\n${t('This message was sent from {siteDomain} to {email}.', {
        siteDomain: data.siteDomain,
        email: data.toEmail,
        interpolation
    })}`;
}
