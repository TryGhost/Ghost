import type {Translate} from '../gift-email-renderer';

export interface GiftReminderData {
    siteTitle: string;
    siteUrl: string;
    siteIconUrl: string | null;
    siteDomain: string;
    accentColor: string | undefined;
    memberEmail: string;
    firstName: string | null;
    gift: {
        tierName: string;
        consumesAt: string;
        manageSubscriptionUrl: string;
    };
}

export function renderText(data: GiftReminderData, t: Translate): string {
    const greeting = data.firstName
        ? t('Hi {firstName},', {firstName: data.firstName, interpolation: {escapeValue: false}})
        : t('Hey there,');

    return `${greeting}

${t('Your gift subscription to {siteTitle} ends on {consumesAt}.', {
        siteTitle: data.siteTitle,
        consumesAt: data.gift.consumesAt,
        interpolation: {escapeValue: false}
    })}

${t('To keep your {tierName} membership, continue with a paid subscription today and we\'ll automatically add the rest of your gift period as a free trial.', {
        tierName: data.gift.tierName,
        interpolation: {escapeValue: false}
    })}

${t('Continue subscription')}:
${data.gift.manageSubscriptionUrl}

${t('Thanks for reading {siteTitle}.', {
        siteTitle: data.siteTitle,
        interpolation: {escapeValue: false}
    })}

---
${t('This message was sent from {siteDomain} to {email}.', {
        siteDomain: data.siteDomain,
        email: data.memberEmail,
        interpolation: {escapeValue: false}
    })}`;
}
