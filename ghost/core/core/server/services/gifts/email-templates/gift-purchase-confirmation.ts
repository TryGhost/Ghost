export interface GiftPurchaseConfirmationData {
    siteTitle: string;
    siteDomain: string;
    toEmail: string;
    gift: {
        tierName: string;
        cadenceLabel: string;
        link: string;
        expiresAt: string;
    };
}

export function renderText(data: GiftPurchaseConfirmationData): string {
    return `Your gift is ready

Thanks for supporting ${data.siteTitle}. Share the link below to give someone access to ${data.gift.tierName} membership for ${data.gift.cadenceLabel}.

${data.gift.link}

The link can be redeemed once and expires on ${data.gift.expiresAt}.

Happy gifting.

---
This message was sent from ${data.siteDomain} to ${data.toEmail}.`;
}
