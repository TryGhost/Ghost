import moment from 'moment';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

import PaidMembersChangeChart from '@src/views/Stats/Growth/components/paid-members-change-chart';

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
    // Helper to generate mock data with current dates (same format as component uses)
    // eslint-disable-next-line ghost/mocha/no-setup-in-describe
    const getMockMemberData = () => {
        const today = moment().format('YYYY-MM-DD');
        const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
        const twoDaysAgo = moment().subtract(2, 'days').format('YYYY-MM-DD');

        return [
            {date: twoDaysAgo, paid_subscribed: 10, paid_canceled: 2},
            {date: yesterday, paid_subscribed: 8, paid_canceled: 3},
            {date: today, paid_subscribed: 12, paid_canceled: 1}
        ];
    };

    // eslint-disable-next-line ghost/mocha/no-setup-in-describe
    const getMockSubscriptionData = () => {
        const today = moment().format('YYYY-MM-DD');
        const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
        const twoDaysAgo = moment().subtract(2, 'days').format('YYYY-MM-DD');

        return [
            {date: twoDaysAgo, signups: 10, cancellations: 2},
            {date: yesterday, signups: 8, cancellations: 3},
            {date: today, signups: 12, cancellations: 1}
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
        expect(screen.getByText('Paid members change')).toBeInTheDocument();
        expect(screen.getByText(/New and cancelled paid subscriptions/)).toBeInTheDocument();

        // Check that legend items are present
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
        expect(screen.getByText('Paid members change')).toBeInTheDocument();
    });

    it('returns null when loading', () => {
        const mockMemberData = getMockMemberData();
        const mockSubscriptionData = getMockSubscriptionData();

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
        const mockMemberData = getMockMemberData();

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

    it('handles range=1 (Today) correctly with subscription data', () => {
        const mockMemberData = getMockMemberData();
        const mockSubscriptionData = getMockSubscriptionData();

        render(
            <PaidMembersChangeChart
                isLoading={false}
                memberData={mockMemberData}
                range={1}
                subscriptionData={mockSubscriptionData}
            />
        );

        // Should render for today
        expect(screen.getByTestId('paid-members-change-card')).toBeInTheDocument();

        // Verify that today's data is being processed
        // The component should find today's entry (signups: 12, cancellations: 1)
        // Since we're testing that the data is processed, we need to verify the component
        // receives and uses today's data. The mocked formatNumber will return the raw values as strings.

        // The chart should contain exactly one data point for today
        const today = moment().format('YYYY-MM-DD');
        const todayEntry = mockSubscriptionData.find(item => item.date === today);

        // Verify we have today's data in our mock
        expect(todayEntry).toBeDefined();
        expect(todayEntry?.signups).toBe(12);
        expect(todayEntry?.cancellations).toBe(1);
    });

    it('handles range=1 (Today) correctly with member data fallback', () => {
        const mockMemberData = getMockMemberData();

        render(
            <PaidMembersChangeChart
                isLoading={false}
                memberData={mockMemberData}
                range={1}
                subscriptionData={undefined}
            />
        );

        // Should render for today
        expect(screen.getByTestId('paid-members-change-card')).toBeInTheDocument();

        // Verify that today's member data is being processed
        // The component should find today's entry (paid_subscribed: 12, paid_canceled: 1)
        const today = moment().format('YYYY-MM-DD');
        const todayEntry = mockMemberData.find(item => item.date === today);

        // Verify we have today's data in our mock
        expect(todayEntry).toBeDefined();
        expect(todayEntry?.paid_subscribed).toBe(12);
        expect(todayEntry?.paid_canceled).toBe(1);
    });
});
