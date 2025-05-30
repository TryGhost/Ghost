import {expect, test} from '@playwright/test';

test.describe('App', async () => {
    test('App renders', async ({page}) => {
        await page.goto('/');

        await expect(page.locator('#root')).toBeVisible();

        const rootExists = await page.evaluate(() => {
            return document.getElementById('root') !== null;
        });

        expect(rootExists).toBe(true);
    });
});
