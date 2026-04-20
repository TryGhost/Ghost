export interface GiftReminderData {
    siteTitle: string;
    siteUrl: string;
    siteIconUrl: string | null;
    siteDomain: string;
    accentColor: string | undefined;
    memberEmail: string;
    memberName: string | null;
    gift: {
        tierName: string;
        cadenceLabel: string;
        consumesAt: string;
        manageSubscriptionUrl: string;
    };
}

export function renderText(data: GiftReminderData): string {
    const greeting = data.memberName ? `Hi ${data.memberName},` : 'Hi,';

    return `${greeting}

Your gift subscription to ${data.siteTitle} ends on ${data.gift.consumesAt}.

Gift subscription: ${data.gift.tierName} • ${data.gift.cadenceLabel}

To keep your access, continue with a paid subscription before your gift ends:
${data.gift.manageSubscriptionUrl}

---

Sent to ${data.memberEmail} from ${data.siteDomain}.
You received this email because your gift subscription to ${data.siteTitle} is ending soon.`;
}
