import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

import PaidMembersChangeChart from '@src/views/Stats/Growth/components/paid-subscription-change-chart';

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
    // Helper to generate mock data with dates within the mocked range (2024-01-01 to 2024-01-31)
    const getMockMemberData = () => {
        return [
            {date: '2024-01-10', paid_subscribed: 10, paid_canceled: 2},
            {date: '2024-01-15', paid_subscribed: 8, paid_canceled: 3},
            {date: '2024-01-20', paid_subscribed: 12, paid_canceled: 1}
        ];
    };

    const getMockSubscriptionData = () => {
        return [
            {date: '2024-01-10', signups: 10, cancellations: 2},
            {date: '2024-01-15', signups: 8, cancellations: 3},
            {date: '2024-01-20', signups: 12, cancellations: 1}
        ];
    };

    it('renders with subscription data', () => {
        const mockMemberData = getMockMemberData();
        const mockSubscriptionData = getMockSubscriptionData();

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
        expect(screen.getByText('Paid subscriptions')).toBeInTheDocument();
        expect(screen.getByText(/New and cancelled paid subscriptions/)).toBeInTheDocument();

        // Check that legend items are present with totals
        expect(screen.getByText('New')).toBeInTheDocument();
        expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it('renders with member data when subscription data is not available', () => {
        const mockMemberData = getMockMemberData();

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
        expect(screen.getByText('Paid subscriptions')).toBeInTheDocument();
    });

    it('shows resolution dropdown for ranges >= 30 days', () => {
        const mockMemberData = getMockMemberData();
        const mockSubscriptionData = getMockSubscriptionData();

        render(
            <PaidMembersChangeChart
                isLoading={false}
                memberData={mockMemberData}
                range={30}
                subscriptionData={mockSubscriptionData}
            />
        );

        // Should show the resolution dropdown for 30-day range
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).toHaveTextContent('Weekly');
    });
});
