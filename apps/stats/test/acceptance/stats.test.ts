import {AnalyticsOverviewPage} from '@tryghost/e2e/build/helpers/pages/admin';
import {
    createMockRequests,
    mockApi
} from '@tryghost/admin-x-framework/test/acceptance';
import {expect, test} from '@playwright/test';
import {tinybirdConfig} from '../utils/tinybird-helpers.ts';

test.describe('Stats App', () => {
    test('loads with default mocked data', async ({page}) => {
        // Use the default mock requests - includes all common endpoints
        await mockApi({page, requests: createMockRequests(
            {browseTinyBirdToken: {
                method: 'GET',
                path: /^\/tinybird\/token\//,
                response: tinybirdConfig
            }}
        )});

        const overviewPage = new AnalyticsOverviewPage(page);
        await overviewPage.goto();

        await expect(overviewPage.header).toBeVisible();
    });

    test('shows an error without mocked data', async ({page}) => {
        const overviewPage = new AnalyticsOverviewPage(page);
        await overviewPage.goto();

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
            },
            browseTinyBirdToken: {
                method: 'GET',
                path: /^\/tinybird\/token\//,
                response: tinybirdConfig
            }
        })});

        const overviewPage = new AnalyticsOverviewPage(page);
        await overviewPage.goto();

        await expect(overviewPage.body).toContainText('155');
    });
});
