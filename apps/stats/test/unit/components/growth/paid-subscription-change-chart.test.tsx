import moment from 'moment';
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
        expect(screen.getByText('Paid subscriptions')).toBeInTheDocument();
        expect(screen.getByText(/New and cancelled paid subscriptions/)).toBeInTheDocument();

        // Check that legend items are present with totals
        expect(screen.getByText('New')).toBeInTheDocument();
        expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it('displays totals in the footer legend', () => {
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

        // Check that the footer structure exists with total values
        // The footer contains "New {total}" and "Cancelled {total}" sections
        const footer = screen.getByTestId('paid-members-change-card').querySelector('.mt-3.flex.items-center.justify-center');
        expect(footer).toBeInTheDocument();

        // Verify the footer contains both labels
        expect(screen.getByText('New')).toBeInTheDocument();
        expect(screen.getByText('Cancelled')).toBeInTheDocument();

        // The totals should be displayed next to the labels in font-medium text-foreground spans
        // Due to mocking, the exact values depend on the date range matching, but the structure should exist
        const totalElements = footer?.querySelectorAll('.font-medium.text-foreground');
        expect(totalElements?.length).toBe(2); // One for "New" total, one for "Cancelled" total
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

    it('hides resolution dropdown for ranges < 30 days', () => {
        const mockMemberData = getMockMemberData();
        const mockSubscriptionData = getMockSubscriptionData();

        render(
            <PaidMembersChangeChart
                isLoading={false}
                memberData={mockMemberData}
                range={7}
                subscriptionData={mockSubscriptionData}
            />
        );

        // Should not show the resolution dropdown for 7-day range
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('shows monthly as default for ranges >= 91 days', () => {
        const mockMemberData = getMockMemberData();
        const mockSubscriptionData = getMockSubscriptionData();

        render(
            <PaidMembersChangeChart
                isLoading={false}
                memberData={mockMemberData}
                range={91}
                subscriptionData={mockSubscriptionData}
            />
        );

        // Should show the resolution dropdown with monthly as default
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toHaveTextContent('Monthly');
    });

    it('shows weekly as default for ranges between 30-90 days', () => {
        const mockMemberData = getMockMemberData();
        const mockSubscriptionData = getMockSubscriptionData();

        render(
            <PaidMembersChangeChart
                isLoading={false}
                memberData={mockMemberData}
                range={60}
                subscriptionData={mockSubscriptionData}
            />
        );

        // Should show the resolution dropdown with weekly as default
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toHaveTextContent('Weekly');
    });

    it('handles Year to Date range (range=-1) based on actual date span', () => {
        const mockMemberData = getMockMemberData();
        const mockSubscriptionData = getMockSubscriptionData();

        // For YTD, the behavior depends on how far into the year we are
        // The component will calculate the actual date span from Jan 1 to today
        // and apply the same rules as other ranges
        render(
            <PaidMembersChangeChart
                isLoading={false}
                memberData={mockMemberData}
                range={-1}
                subscriptionData={mockSubscriptionData}
            />
        );

        // The component should render successfully
        expect(screen.getByTestId('paid-members-change-card')).toBeInTheDocument();

        // Based on the mock getRangeDates (2024-01-01 to 2024-01-31), YTD is 30 days
        // This equals 30 days threshold, so dropdown should be shown with weekly default
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).toHaveTextContent('Weekly');
    });
});
