import {expect, test} from '@playwright/test';

test.describe('Acceptance test - Unsplash Selector', async () => {
    test('Can load the unsplash selector modal', async ({page}) => {
        await page.goto('/');

        const modal = await page.waitForSelector('[data-kg-modal="unsplash"]');

        expect(modal).toBeTruthy();
    });

    test('can load initial images', async ({page}) => {
        await page.goto('/');

        const modal = await page.waitForSelector('[data-kg-modal="unsplash"]');

        const images = await modal.$$('[data-kg-unsplash-gallery-item="true"]');
        expect(images.length).toBeGreaterThan(0);
    });

    test('Can search for images', async ({page}) => {
        await page.goto('/');

        const modal = await page.waitForSelector('[data-kg-modal="unsplash"]');
        // data-kg-unsplash-search="true"
        const searchInput = await modal.$('[data-kg-unsplash-search="true"]');

        await searchInput?.fill('test');

        const searchResults = await modal.$$('.unsplash-image');
        expect(searchResults.length).toBeGreaterThan(0);
    });
});
