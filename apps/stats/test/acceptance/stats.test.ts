import OverviewTab from './pages/OverviewTab.ts';
import {
    createMockRequests,
    mockApi
} from '@tryghost/admin-x-framework/test/acceptance';
import {expect, test} from '@playwright/test';

test.describe('Stats App', () => {
    test('loads with default mocked data', async ({page}) => {
        // Use the default mock requests - includes all common endpoints
        await mockApi({page, requests: createMockRequests()});

        const overviewPage = new OverviewTab(page);
        await overviewPage.visit();

        await expect(overviewPage.header).toBeVisible();
    });

    test('shows an error without mocked data', async ({page}) => {
        const overviewPage = new OverviewTab(page);
        await overviewPage.visit();

        await expect(overviewPage.body).toContainText(/Unexpected Application Error/);
    });

    test('loads with custom mocked data', async ({page}) => {
        const customMemberHistory = {
            stats: [
                {date: '2024-01-01', paid: 50, free: 100, comped: 5, paid_subscribed: 2, paid_canceled: 0}
            ],
            meta: {totals: {paid: 50, free: 100, comped: 5}}
        };

        await mockApi({page, requests: createMockRequests({
            browseMemberCountHistory: {
                method: 'GET',
                path: /^\/stats\/member_count\//,
                response: customMemberHistory
            }
        })});

        const overviewPage = new OverviewTab(page);
        await overviewPage.visit();

        await expect(overviewPage.body).toContainText('155');
    });
});
