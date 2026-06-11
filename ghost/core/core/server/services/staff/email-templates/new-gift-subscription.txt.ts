import type {ReadonlyDeep} from 'type-fest';
import type {StaffMemberTextData} from './types';

type NewGiftSubscriptionTextData = StaffMemberTextData & ReadonlyDeep<{
    tierData: {
        name: string;
        details: string | null | undefined;
    };
    giftedByEmail: string;
}>;

export function renderText(data: NewGiftSubscriptionTextData): string {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `
A gift subscription was redeemed

Member: ${data.memberData.name}
Tier: ${data.tierData.name}${data.tierData.details ? ` • ${data.tierData.details}` : ''}
Gifted by: ${data.giftedByEmail}

---

Sent to ${data.toEmail} from ${data.siteDomain}.
If you would no longer like to receive these notifications you can adjust your settings at ${data.staffUrl}.
    `;
}
