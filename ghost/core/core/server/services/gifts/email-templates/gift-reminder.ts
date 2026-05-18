import type {Translate} from '../gift-email-renderer';

export interface GiftReminderData {
    siteTitle: string;
    siteUrl: string;
    siteIconUrl: string | null;
    siteDomain: string;
    accentColor: string | undefined;
    memberEmail: string;
    gift: {
        tierName: string;
        consumesAt: string;
        priceAfter: string;
        manageSubscriptionUrl: string;
    };
}

export function renderText(data: GiftReminderData, t: Translate): string {
    return `${t('Hey there,')}

${t('Your gift subscription expires on {consumesAt}.', {
        consumesAt: data.gift.consumesAt,
        interpolation: {escapeValue: false}
    })}

${t('If you\'ve been enjoying {siteTitle}, continue your membership for {priceAfter} to keep full access to every post and newsletter.', {
        siteTitle: data.siteTitle,
        priceAfter: data.gift.priceAfter,
        interpolation: {escapeValue: false}
    })}

${t('Continue membership')}:
${data.gift.manageSubscriptionUrl}

---
${t('This message was sent from {siteDomain} to {email}.', {
        siteDomain: data.siteDomain,
        email: data.memberEmail,
        interpolation: {escapeValue: false}
    })}`;
}
