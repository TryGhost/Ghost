import type {Translate} from '../gift-email-renderer';

export interface GiftDeliveredConfirmationData {
    siteTitle: string;
    siteUrl: string;
    siteIconUrl: string | null;
    siteDomain: string;
    accentColor: string | undefined;
    toEmail: string;
    gift: {
        tierName: string;
        cadenceLabel: string;
        recipientEmail: string;
        link: string;
        expiresAt: string;
    };
}

export function renderText(data: GiftDeliveredConfirmationData, t: Translate): string {
    return `${t('Your gift has been delivered')}

${t('Good news — your {cadenceLabel} {tierName} membership to {siteTitle} was just delivered to {recipientEmail}.', {
        cadenceLabel: data.gift.cadenceLabel,
        tierName: data.gift.tierName,
        siteTitle: data.siteTitle,
        recipientEmail: data.gift.recipientEmail,
        interpolation: {escapeValue: false}
    })}

${t('If it doesn\'t arrive, you can also share the link below yourself.', {
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
