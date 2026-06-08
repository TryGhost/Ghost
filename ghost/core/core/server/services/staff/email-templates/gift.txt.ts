import type {ReadonlyDeep} from 'type-fest';
import type {StaffTextBaseData} from './types';

type GiftTextData = StaffTextBaseData & ReadonlyDeep<{
    gift: {
        name: string;
        tierName: string;
        cadenceLabel: string;
        amount: string;
    };
}>;

export function renderText(data: GiftTextData): string {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `
A gift subscription was purchased

From: ${data.gift.name}
Tier: ${data.gift.tierName} • ${data.gift.cadenceLabel}
Amount received: ${data.gift.amount}

---

Sent to ${data.toEmail} from ${data.siteDomain}.
If you would no longer like to receive these notifications you can adjust your settings at ${data.staffUrl}.
    `;
}
