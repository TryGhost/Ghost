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

export function renderText(data: GiftReminderData): string {
    return `Hey there,

Your gift subscription expires on ${data.gift.consumesAt}.

If you've been enjoying ${data.siteTitle}, continue your membership for ${data.gift.priceAfter} to keep full access to every post and newsletter.

Continue membership:
${data.gift.manageSubscriptionUrl}

---
This message was sent from ${data.siteDomain} to ${data.memberEmail}.`;
}
