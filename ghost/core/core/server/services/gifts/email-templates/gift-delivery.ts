import type {Translate} from '../gift-email-renderer';

export interface GiftDeliveryData {
    siteTitle: string;
    siteUrl: string;
    siteIconUrl: string | null;
    siteDomain: string;
    accentColor: string | undefined;
    toEmail: string;
    buyerName: string | null;
    message: string | null;
    gift: {
        tierName: string;
        cadenceLabel: string;
        link: string;
        expiresAt: string;
    };
}

export function renderText(data: GiftDeliveryData, t: Translate): string {
    const intro = data.buyerName
        ? t('{buyerName} has gifted you a {cadenceLabel} {tierName} membership to {siteTitle}.', {
            buyerName: data.buyerName,
            cadenceLabel: data.gift.cadenceLabel,
            tierName: data.gift.tierName,
            siteTitle: data.siteTitle,
            interpolation: {escapeValue: false}
        })
        : t('You\'ve been gifted a {cadenceLabel} {tierName} membership to {siteTitle}.', {
            cadenceLabel: data.gift.cadenceLabel,
            tierName: data.gift.tierName,
            siteTitle: data.siteTitle,
            interpolation: {escapeValue: false}
        });

    const messageBlock = data.message
        ? `\n"${data.message}"${data.buyerName ? `\n— ${data.buyerName}` : ''}\n`
        : '';

    return `${t('A gift, just for you')}

${intro}
${messageBlock}
${t('Redeem your gift')}:
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
