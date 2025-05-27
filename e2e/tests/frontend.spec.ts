import {expect, test} from '../src/test-fixtures';

test.describe('Frontend', () => {
    test('should load homepage', async ({page}) => {
        await page.goto('/');

        // Check that the page loads
        await expect(page).toHaveTitle(/E2E Test Blog/);

        // Check for basic Ghost elements
        await expect(page.locator('body')).toBeVisible();
    });
});
