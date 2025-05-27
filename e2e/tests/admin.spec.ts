import {expect, test} from '../src/test-fixtures';

test.describe('Ghost Setup', () => {
    test('should have completed setup', async ({page}) => {
        // Check if setup is complete by visiting the setup API endpoint
        const response = await page.request.get('/ghost/api/admin/authentication/setup/', {
            headers: {
                'Accept-Version': 'v5.0'
            }
        });

        const data = await response.json();
        expect(data.setup[0].status).toBe(true);
    });

    test('should show login page', async ({page}) => {
        await page.goto('/ghost/');

        // Should redirect to login page
        await expect(page).toHaveURL(/\/ghost\/#\/signin/);

        // Should have email and password fields
        await expect(page.locator('input[name="identification"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
    });
});
