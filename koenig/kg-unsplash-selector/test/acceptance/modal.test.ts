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
        await modal.waitForSelector('[data-kg-unsplash-gallery-item="true"]');
        const images = await modal.$$('[data-kg-unsplash-gallery-item="true"]');
        expect(images.length).toBeGreaterThan(0);
    });

    test('Can search for images', async ({page}) => {
        await page.goto('/');
        const modal = await page.waitForSelector('[data-kg-modal="unsplash"]');
        const searchInput = await modal.$('[data-kg-unsplash-search="true"]');
        await searchInput?.fill('train station');
        await modal.waitForSelector('[data-kg-unsplash-gallery-item="true"]');
        const searchResults = await modal.$$('[data-kg-unsplash-gallery-item="true"]');
        expect(searchResults.length).toBe(1);
    });

    test('Can select and zoom on an image', async ({page}) => {
        await page.goto('/');
        const modal = await page.waitForSelector('[data-kg-modal="unsplash"]');
        const searchInput = await modal.$('[data-kg-unsplash-search="true"]');
        await searchInput?.fill('train station');
        await modal.waitForSelector('[data-kg-unsplash-gallery-item="true"]');
        await page.getByText('8Christian LueInsert image').click();
        const zoomed = await modal.waitForSelector('[data-kg-unsplash-zoomed="true"]');
        expect(zoomed).toBeTruthy();
    });
});
