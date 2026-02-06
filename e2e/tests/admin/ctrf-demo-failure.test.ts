import {expect, test} from '@/helpers/playwright/fixture';

/**
 * TEMPORARY TEST - DELETE AFTER CTRF DEMO
 *
 * This test intentionally fails to demonstrate CTRF reporting in CI.
 * It should be deleted after verifying CTRF annotations work correctly.
 */
test.describe('Ghost Admin - CTRF Demo', () => {
    test('this test intentionally fails to demo CTRF reporting', async ({page}) => {
        // Navigate to admin
        await page.goto('/ghost');

        // This assertion will fail - the title won't contain this text
        await expect(page).toHaveTitle(/CTRF Demo - This Will Fail/);
    });

    test('this test also fails with a different error message', async ({page}) => {
        // Navigate to admin
        await page.goto('/ghost');

        // Look for an element that doesn't exist
        const nonExistentElement = page.locator('[data-testid="ctrf-demo-element-does-not-exist"]');
        await expect(nonExistentElement).toBeVisible({timeout: 5000});
    });
});
