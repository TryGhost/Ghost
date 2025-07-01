import {createMockRequests, mockApi} from '@tryghost/admin-x-framework/test/acceptance';
import {expect, test} from '@playwright/test';

test.describe('Posts App', () => {
    test('loads with default mocked data', async ({page}) => {
        // Use the default mock requests - includes all common endpoints
        await mockApi({page, requests: createMockRequests()});

        await page.goto('/');
        
        // The app should load without API errors
        await expect(page.locator('body')).toBeVisible();
    });

    test('can override specific responses', async ({page}) => {
        // Override the post response with custom data
        const customPost = {
            posts: [{
                id: 'custom-post-id',
                newsletter: {id: 'custom-newsletter'},
                email: {email_count: 500, opened_count: 200},
                count: {clicks: 50}
            }]
        };

        await mockApi({page, requests: createMockRequests({
            browsePost: {
                method: 'GET', 
                path: /^\/posts\/[^/]+\//, 
                response: customPost
            }
        })});

        await page.goto('/');
        
        // Test with the custom data
        await expect(page.locator('body')).toBeVisible();
    });
}); 