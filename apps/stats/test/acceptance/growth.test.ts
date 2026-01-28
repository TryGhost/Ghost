import GrowthTab from './pages/growth-tab.ts';
import {
    createMockRequests,
    mockApi,
    toggleLabsFlag
} from '@tryghost/admin-x-framework/test/acceptance';
import {expect, test} from '@playwright/test';

test.beforeEach(() => {
    // Enable the paidBreakdownCharts feature flag for these tests
    toggleLabsFlag('paidBreakdownCharts', true);
});

test.afterEach(() => {
    // Reset the flag after each test
    toggleLabsFlag('paidBreakdownCharts', false);
});

test.describe('Stats App - Growth', () => {
    test('displays change chart as separate section when paid members are enabled', async ({page}) => {
        // Mock data with paid members enabled
        const mockSubscriptionStats = {
            stats: [
                {date: '2024-01-01', signups: 10, cancellations: 2, tier: 'tier-1', cadence: 'month', count: 100, positive_delta: 10, negative_delta: 2},
                {date: '2024-01-02', signups: 8, cancellations: 3, tier: 'tier-1', cadence: 'month', count: 105, positive_delta: 8, negative_delta: 3},
                {date: '2024-01-03', signups: 12, cancellations: 1, tier: 'tier-1', cadence: 'year', count: 50, positive_delta: 12, negative_delta: 1}
            ],
            meta: {
                tiers: ['tier-1'],
                cadences: ['month', 'year'],
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 105},
                    {tier: 'tier-1', cadence: 'year', count: 50}
                ]
            }
        };

        const mockMemberHistory = {
            stats: [
                {date: '2024-01-01', paid: 150, free: 100, comped: 5, paid_subscribed: 10, paid_canceled: 2},
                {date: '2024-01-02', paid: 155, free: 105, comped: 5, paid_subscribed: 8, paid_canceled: 3},
                {date: '2024-01-03', paid: 161, free: 110, comped: 5, paid_subscribed: 12, paid_canceled: 1}
            ],
            meta: {totals: {paid: 161, free: 110, comped: 5}}
        };

        await mockApi({page, requests: createMockRequests({
            browseSubscriptionStats: {
                method: 'GET',
                path: /^\/stats\/subscriptions\//,
                response: mockSubscriptionStats
            },
            browseMemberCountHistory: {
                method: 'GET',
                path: /^\/stats\/member_count\//,
                response: mockMemberHistory
            }
        })});

        const growthPage = new GrowthTab(page);
        await growthPage.visit();

        // Check that the change chart card appears as a separate section (not in tabs)
        // The card should have the title "Paid members change"
        await expect(growthPage.body).toContainText('Paid members change');

        // Verify that both "New" and "Cancelled" labels are visible in the legend
        await expect(growthPage.body).toContainText('New');
        await expect(growthPage.body).toContainText('Cancelled');
    });

    test('displays new subscribers breakdown pie chart when paid members exist', async ({page}) => {
        const mockSubscriptionStats = {
            stats: [
                {date: '2024-01-01', signups: 10, cancellations: 2, tier: 'tier-1', cadence: 'month', count: 100, positive_delta: 10, negative_delta: 2},
                {date: '2024-01-02', signups: 8, cancellations: 3, tier: 'tier-1', cadence: 'year', count: 50, positive_delta: 8, negative_delta: 3}
            ],
            meta: {
                tiers: ['tier-1'],
                cadences: ['month', 'year'],
                totals: [
                    {tier: 'tier-1', cadence: 'month', count: 100},
                    {tier: 'tier-1', cadence: 'year', count: 50}
                ]
            }
        };

        const mockMemberHistory = {
            stats: [
                {date: '2024-01-01', paid: 150, free: 100, comped: 5}
            ],
            meta: {totals: {paid: 150, free: 100, comped: 5}}
        };

        await mockApi({page, requests: createMockRequests({
            browseSubscriptionStats: {
                method: 'GET',
                path: /^\/stats\/subscriptions\//,
                response: mockSubscriptionStats
            },
            browseMemberCountHistory: {
                method: 'GET',
                path: /^\/stats\/member_count\//,
                response: mockMemberHistory
            }
        })});

        const growthPage = new GrowthTab(page);
        await growthPage.visit();

        // Check that the new subscribers breakdown card appears
        await expect(growthPage.body).toContainText('New subscribers');
        await expect(growthPage.body).toContainText('New paid subscriptions');

        // Check for cadence labels (Monthly/Annual)
        await expect(growthPage.body).toContainText('Monthly');
        await expect(growthPage.body).toContainText('Annual');
    });
});
