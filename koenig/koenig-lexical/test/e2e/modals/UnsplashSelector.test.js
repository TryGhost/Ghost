import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {expect} from '@playwright/test';
import {focusEditor, initialize, startApp} from '../../utils/e2e';

describe('Modals', async () => {
    let app;
    let page;

    beforeAll(async () => {
        ({app, page} = await startApp());
    });

    afterAll(async () => {
        await app.stop();
    });

    beforeEach(async () => {
        await initialize({page});
    });

    test('can open selector', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
    });

    test('renders (empty) image card under container', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await expect(page.locator('[data-kg-card="image"]')).toBeVisible();
    });

    test('can close selector', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await page.click('[data-kg-modal-close-button]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).not.toBeVisible();
    });

    test('empty image card removed when closing model', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await page.click('[data-kg-modal-close-button]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).not.toBeVisible();
        await expect(page.locator('[data-kg-card="image"]')).not.toBeVisible();
    });

    test('renders unsplash gallery', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await expect(page.locator('[data-kg-unsplash-gallery]')).toBeVisible();
    });

    test('can select / zoom image', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await expect(page.locator('[data-kg-plus-menu]')).toBeVisible();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        await expect(page.locator('[data-kg-unsplash-gallery]')).toBeVisible();
        await page.waitForSelector('[data-kg-unsplash-gallery-item]');
        await page.click('[data-kg-unsplash-gallery-item]');
        expect(await page.$('[data-kg-unsplash-zoomed]')).not.toBeNull();
    });

    test('can download image', async () => {
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

    test('can click like button, opens in new tab', async () => {
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

    test('can search for photos', async () => {
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

    test('closes a zoomed image when searching', async () => {
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

    test.todo('can infinite scroll');
});
