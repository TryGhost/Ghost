import type {MemberRecord} from './types';
import type {MemberState} from '../../types';

/** Valid-format uuid so account pages that validate it (e.g. Transistor) accept the fixture. */
const PREVIEW_UUID = '05c63e9f-2a4b-4d6e-9f1a-3b8c7d2e4f50';

/**
 * Fake paid member shown on account-page previews in Ghost Admin.
 * Ports apps/portal/src/utils/fixtures.js#member.preview into superportal's
 * record shape. Factory, not a constant: `current_period_end` must be "now".
 */
export function getPreviewMemberRecord(): MemberRecord {
    return {
        id: 'preview-member',
        uuid: PREVIEW_UUID,
        email: 'jamie@example.com',
        name: 'Jamie Larson',
        firstname: 'Jamie',
        status: 'paid',
        paid: true,
        subscribed: true,
        avatar_image: '',
        newsletters: [],
        email_suppression: {suppressed: false},
        subscriptions: [
            {
                id: 'sub-preview',
                status: 'active',
                start_date: '2019-05-01T11:42:40.000Z',
                current_period_end: new Date().toISOString(),
                cancel_at_period_end: false,
                default_payment_card_last4: '4242',
                price: {
                    id: 'price-preview',
                    price_id: 'price-preview',
                    currency: 'USD',
                    amount: 1500,
                    interval: 'year'
                }
            }
        ]
    };
}

export function getPreviewMember(): MemberState {
    return {
        id: 'preview-member',
        uuid: PREVIEW_UUID,
        email: 'jamie@example.com',
        name: 'Jamie Larson',
        status: 'paid'
    };
}
