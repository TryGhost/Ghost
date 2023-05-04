// TODO: Switch to mocked API. Currently uses real Unsplash API so the asserted test data isn't stable
import {expect, test} from '@playwright/test';
import {focusEditor, initialize} from '../../utils/e2e';

test.describe('Modals', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test.skip('can open selector', async ({page}) => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
    });

    test.skip('renders (empty) image card under container', async ({page}) => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await expect(page.locator('[data-kg-card="image"]')).toBeVisible();
    });

    test.skip('can close selector', async ({page}) => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await page.click('[data-kg-modal-close-button]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).not.toBeVisible();
    });

    test.skip('empty image card removed when closing model', async ({page}) => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await page.click('[data-kg-modal-close-button]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).not.toBeVisible();
        await expect(page.locator('[data-kg-card="image"]')).not.toBeVisible();
    });

    test.skip('renders unsplash gallery', async ({page}) => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await expect(page.locator('[data-kg-unsplash-gallery]')).toBeVisible();
    });

    test.skip('can select / zoom image', async ({page}) => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        await expect(page.locator('[data-kg-unsplash-gallery]')).toBeVisible();
        await page.waitForSelector('[data-kg-unsplash-gallery-item]');
        await page.click('[data-kg-unsplash-gallery-item]');
        expect(await page.locator('[data-kg-unsplash-zoomed]')).not.toBeNull();
    });

    test.skip('can download image', async ({page}) => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        await expect(page.locator('[data-kg-unsplash-gallery]')).toBeVisible();
        await page.waitForSelector('[data-kg-unsplash-gallery-item]');
        await page.click('[data-kg-unsplash-gallery-item]');
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.click('[data-kg-button="unsplash-download"]')
        ]);
        expect(download.suggestedFilename()).toContain('unsplash.jpg');
    });

    test.skip('can click like button, opens in new tab', async ({page}) => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        await expect(page.locator('[data-kg-unsplash-gallery]')).toBeVisible();
        await page.waitForSelector('[data-kg-unsplash-gallery-item]');
        await page.click('[data-kg-unsplash-gallery-item]');
        await expect(page.locator('[data-kg-button="unsplash-like"]')).toBeVisible();
        const [newPage] = await Promise.all([
            page.waitForEvent('popup'),
            page.click('[data-kg-button="unsplash-like"]')
        ]);
        expect(newPage.url()).toContain('unsplash.com');
    });

    test.skip('can search for photos', async ({page}) => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        await expect(page.locator('[data-kg-unsplash-gallery]')).toBeVisible();
        await expect(page.locator('[data-kg-unsplash-search]')).toBeVisible();
        const searchTerm = 'kitten';
        await page.click('[data-kg-unsplash-search]');
        await page.type('[data-kg-unsplash-search]', searchTerm);
        // wait 5 seconds for search results
        await page.waitForTimeout(5000);
        await page.waitForSelector('[data-kg-unsplash-gallery-item]');
        const images = await page.$$('img[data-kg-unsplash-gallery-img]');
        const altTexts = await Promise.all(images.map(img => img.getAttribute('alt')));
        expect(altTexts.some(alt => alt.includes(searchTerm))).toBe(true);
    });

    test.skip('closes a zoomed image when searching', async ({page}) => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        await expect(page.locator('[data-kg-unsplash-gallery]')).toBeVisible();
        await page.waitForSelector('[data-kg-unsplash-gallery-item]');
        await page.click('[data-kg-unsplash-gallery-item]');
        await expect(page.locator('[data-kg-unsplash-zoomed]')).toBeVisible();
        await expect(page.locator('[data-kg-unsplash-search]')).toBeVisible();
        const searchTerm = 'kitten';
        await page.click('[data-kg-unsplash-search]');
        await page.type('[data-kg-unsplash-search]', searchTerm);
        // wait 5 seconds for search results
        await page.waitForTimeout(5000);
        await page.waitForSelector('[data-kg-unsplash-gallery-item]');
        await expect(page.locator('[data-kg-unsplash-zoomed]')).not.toBeVisible();
    });

    //test.fixme('can infinite scroll');
});
