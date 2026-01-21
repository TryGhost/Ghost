import PaidMembersChangeChart from '@src/views/Stats/Growth/components/paid-members-change-chart';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

// Mock dependencies from @tryghost/shade
vi.mock('@tryghost/shade', async () => {
    const actual = await vi.importActual('@tryghost/shade');
    return {
        ...actual,
        formatDisplayDateWithRange: vi.fn((date: string) => `Formatted: ${date}`),
        formatNumber: vi.fn((value: number) => value.toString()),
        getRangeDates: vi.fn(() => ({
            startDate: '2024-01-01',
            endDate: '2024-01-31'
        }))
    };
});

// Mock chart helpers
vi.mock('@src/utils/chart-helpers', () => ({
    determineAggregationStrategy: vi.fn(() => 'daily'),
    getPeriodText: vi.fn((range: number) => `in the last ${range} days`),
    sanitizeChartData: vi.fn((data: unknown[]) => data)
}));

describe('PaidMembersChangeChart Component', () => {
    const mockMemberData = [
        {date: '2024-01-01', paid_subscribed: 10, paid_canceled: 2},
        {date: '2024-01-02', paid_subscribed: 8, paid_canceled: 3},
        {date: '2024-01-03', paid_subscribed: 12, paid_canceled: 1}
    ];

    const mockSubscriptionData = [
        {date: '2024-01-01', signups: 10, cancellations: 2},
        {date: '2024-01-02', signups: 8, cancellations: 3},
        {date: '2024-01-03', signups: 12, cancellations: 1}
    ];

    it('renders with subscription data', () => {
        render(
            <PaidMembersChangeChart
                isLoading={false}
                memberData={mockMemberData}
                range={30}
                subscriptionData={mockSubscriptionData}
            />
        );

        // Check that the card is rendered
        expect(screen.getByTestId('paid-members-change-card')).toBeInTheDocument();

        // Check that title and description are present
        expect(screen.getByText('Paid members change')).toBeInTheDocument();
        expect(screen.getByText(/New and cancelled paid subscriptions/)).toBeInTheDocument();

        // Check that legend items are present
        expect(screen.getByText('New')).toBeInTheDocument();
        expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it('renders with member data when subscription data is not available', () => {
        render(
            <PaidMembersChangeChart
                isLoading={false}
                memberData={mockMemberData}
                range={30}
                subscriptionData={undefined}
            />
        );

        // Should still render the card
        expect(screen.getByTestId('paid-members-change-card')).toBeInTheDocument();
        expect(screen.getByText('Paid members change')).toBeInTheDocument();
    });

    it('returns null when loading', () => {
        const {container} = render(
            <PaidMembersChangeChart
                isLoading={true}
                memberData={mockMemberData}
                range={30}
                subscriptionData={mockSubscriptionData}
            />
        );

        expect(container.firstChild).toBeNull();
    });

    it('returns null when no data is available', () => {
        const {container} = render(
            <PaidMembersChangeChart
                isLoading={false}
                memberData={[]}
                range={30}
                subscriptionData={[]}
            />
        );

        expect(container.firstChild).toBeNull();
    });

    it('handles empty subscription data array', () => {
        render(
            <PaidMembersChangeChart
                isLoading={false}
                memberData={mockMemberData}
                range={30}
                subscriptionData={[]}
            />
        );

        // Should fall back to member data and render
        expect(screen.getByTestId('paid-members-change-card')).toBeInTheDocument();
    });

    it('handles range=1 (Today) correctly', () => {
        render(
            <PaidMembersChangeChart
                isLoading={false}
                memberData={mockMemberData}
                range={1}
                subscriptionData={mockSubscriptionData}
            />
        );

        // Should still render for today
        expect(screen.getByTestId('paid-members-change-card')).toBeInTheDocument();
    });
});
