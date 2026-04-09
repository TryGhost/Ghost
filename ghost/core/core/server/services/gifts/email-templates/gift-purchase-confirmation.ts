export interface GiftPurchaseConfirmationData {
    siteTitle: string;
    siteDomain: string;
    toEmail: string;
    gift: {
        amount: string;
        tierName: string;
        cadenceLabel: string;
        link: string;
        expiresAt: string;
    };
}

export function renderText(data: GiftPurchaseConfirmationData): string {
    return `Your gift is ready to share!

Share the link below with the recipient to let them redeem their gift membership.

Gift subscription: ${data.gift.tierName} • ${data.gift.cadenceLabel}
Amount paid: ${data.gift.amount}

Redemption link: ${data.gift.link}

This link can be redeemed once and expires on ${data.gift.expiresAt}. It's only available to free or new members.

---

Sent to ${data.toEmail} from ${data.siteDomain}.
You received this email because you purchased a gift subscription on ${data.siteTitle}.`;
}
