import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import MembersListItem from './members-list-item';
import type {Member} from '@tryghost/admin-x-framework/api/members';
import type {CSSProperties} from 'react';

describe('MembersListItem', () => {
    it('renders active dynamic filter columns', () => {
        const member = {
            id: 'member-1',
            uuid: 'member-1',
            transient_id: 'member-1',
            name: 'Alex',
            email: 'alex@example.com',
            status: 'paid',
            subscribed: true,
            last_seen_at: null,
            last_commented_at: null,
            created_at: '2024-01-01 00:00:00',
            updated_at: '2024-01-01 00:00:00',
            subscriptions: [
                {
                    id: 'sub_1',
                    customer: {
                        id: 'cus_1',
                        name: 'Alex',
                        email: 'alex@example.com'
                    },
                    plan: {
                        id: 'plan_1',
                        nickname: 'Monthly',
                        interval: 'month',
                        currency: 'usd',
                        amount: 500
                    },
                    status: 'past_due',
                    start_date: '2024-01-01 00:00:00',
                    current_period_end: '2024-02-01 00:00:00',
                    cancel_at_period_end: false,
                    price: {
                        id: 'price_1',
                        price_id: 'price_1',
                        nickname: 'Monthly',
                        amount: 500,
                        currency: 'usd',
                        type: 'recurring',
                        interval: 'month'
                    },
                    tier: {
                        id: 'tier_1',
                        name: 'Gold',
                        slug: 'gold',
                        active: true,
                        type: 'paid'
                    },
                    offer: null
                }
            ]
        } satisfies Member;

        render(
            <MembersListItem
                activeColumns={[
                    {
                        key: 'subscriptions.status',
                        label: 'Stripe subscription status',
                        include: 'subscriptions'
                    }
                ]}
                gridStyle={{'--members-grid-cols': 'minmax(0,3fr)'} as CSSProperties}
                item={member}
                showEmailOpenRate={false}
                onClick={() => {}}
            />
        );

        expect(screen.getByText('Past Due')).toBeInTheDocument();
    });
});
