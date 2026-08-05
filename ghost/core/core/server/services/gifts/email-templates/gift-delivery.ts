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
        cadenceLabel: string;
        link: string;
        expiresAt: string;
    };
}

export function renderText(data: GiftDeliveryData, t: Translate): string {
    const greeting = data.recipientName ? `${t('Hi {recipientName},', {recipientName: data.recipientName})}\n\n` : '';
    const intro = data.buyerName
        ? t('{buyerName} has gifted you a {cadenceLabel} {tierName} membership to {siteTitle}.', {
            buyerName: data.buyerName,
            cadenceLabel: data.gift.cadenceLabel,
            tierName: data.gift.tierName,
            siteTitle: data.siteTitle
        })
        : t('You\'ve been gifted a {cadenceLabel} {tierName} membership to {siteTitle}.', {
            cadenceLabel: data.gift.cadenceLabel,
            tierName: data.gift.tierName,
            siteTitle: data.siteTitle
        });
    const message = data.personalMessage ? `\n"${data.personalMessage}"${data.buyerName ? `\n— ${data.buyerName}` : ''}\n` : '';
    const benefits = data.gift.benefits.length ? `\n${t('What\'s included:')}\n${data.gift.benefits.map(benefit => `- ${benefit}`).join('\n')}\n` : '';

    return `${t('A gift, just for you')}\n\n${greeting}${intro}\n${message}${benefits}\n${t('Redeem your gift')}:\n${data.gift.link}\n\n${t('This gift can only be redeemed once and expires on {expiresAt}.', {expiresAt: data.gift.expiresAt})}\n\n---\n${t('This message was sent from {siteDomain} to {email}.', {siteDomain: data.siteDomain, email: data.toEmail})}`;
}
