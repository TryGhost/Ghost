import {createMockRequests, mockApi} from '@tryghost/admin-x-framework/test/acceptance';
import {expect, test} from '@playwright/test';

test.describe('Stats App', () => {
    test('loads with default mocked data', async ({page}) => {
        // Use the default mock requests - includes all common endpoints
        await mockApi({page, requests: createMockRequests()});

        await page.goto('/');
        
        // The app should load without API errors
        await expect(page.locator('body')).toBeVisible();
    });

    test('can override specific responses', async ({page}) => {
        // Override the member count history with custom data
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

        await page.goto('/');
        
        // Test with the custom data
        await expect(page.locator('body')).toBeVisible();
    });
}); 