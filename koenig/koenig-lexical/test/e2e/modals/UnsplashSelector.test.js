import {afterAll, beforeAll, beforeEach, describe, expect, test} from 'vitest';
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
        expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        expect(await page.$('[data-kg-modal="unsplash"]')).not.toBeNull();
    });

    test('renders (empty) image card under container', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        expect(await page.$('[data-kg-modal="unsplash"]')).not.toBeNull();
        expect(await page.$('[data-kg-card="image"]')).not.toBeNull();
    });

    test('can close selector', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        expect(await page.$('[data-kg-modal="unsplash"]')).not.toBeNull();
        await page.click('[data-kg-modal-close-button]');
        expect(await page.$('[data-kg-modal="unsplash"]')).toBeNull();
    });

    test('empty image card removed when closing model', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        expect(await page.$('[data-kg-modal="unsplash"]')).not.toBeNull();
        await page.click('[data-kg-modal-close-button]');
        expect(await page.$('[data-kg-modal="unsplash"]')).toBeNull();
        expect(await page.$('[data-kg-card="image"]')).toBeNull();
    });

    test('renders unsplash gallery', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        expect(await page.$('[data-kg-modal="unsplash"]')).not.toBeNull();
        expect(await page.$('[data-kg-unsplash-gallery]')).not.toBeNull();
    });

    test('can select / zoom image', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        expect(await page.$('[data-kg-modal="unsplash"]')).not.toBeNull();
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        expect(await page.$('[data-kg-unsplash-gallery]')).not.toBeNull();
        await page.waitForSelector('[data-kg-unsplash-gallery-item]');
        await page.click('[data-kg-unsplash-gallery-item]');
        expect(await page.$('[data-kg-unsplash-zoomed]')).not.toBeNull();
    });

    test('can download image', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        expect(await page.$('[data-kg-modal="unsplash"]')).not.toBeNull();
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        expect(await page.$('[data-kg-unsplash-gallery]')).not.toBeNull();
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
        expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        expect(await page.$('[data-kg-modal="unsplash"]')).not.toBeNull();
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        expect(await page.$('[data-kg-unsplash-gallery]')).not.toBeNull();
        await page.waitForSelector('[data-kg-unsplash-gallery-item]');
        await page.click('[data-kg-unsplash-gallery-item]');
        expect(await page.$('[data-kg-button="unsplash-like"]')).not.toBeNull();
        const [newPage] = await Promise.all([
            page.waitForEvent('popup'),
            page.click('[data-kg-button="unsplash-like"]')
        ]);
        expect(newPage.url()).toContain('unsplash.com');
    });

    test('can search for photos', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        expect(await page.$('[data-kg-modal="unsplash"]')).not.toBeNull();
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        expect(await page.$('[data-kg-unsplash-gallery]')).not.toBeNull();
        expect(await page.$('[data-kg-unsplash-search]')).not.toBeNull();
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
        expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        expect(await page.$('[data-kg-modal="unsplash"]')).not.toBeNull();
        await page.waitForSelector('[data-kg-unsplash-gallery]');
        expect(await page.$('[data-kg-unsplash-gallery]')).not.toBeNull();
        await page.waitForSelector('[data-kg-unsplash-gallery-item]');
        await page.click('[data-kg-unsplash-gallery-item]');
        expect(await page.$('[data-kg-unsplash-zoomed]')).not.toBeNull();
        expect(await page.$('[data-kg-unsplash-search]')).not.toBeNull();
        const searchTerm = 'kitten';
        await page.click('[data-kg-unsplash-search]');
        await page.type('[data-kg-unsplash-search]', searchTerm);
        // wait 5 seconds for search results
        await page.waitForTimeout(5000);
        await page.waitForSelector('[data-kg-unsplash-gallery-item]');
        expect(await page.$('[data-kg-unsplash-zoomed]')).toBeNull();
    });

    test.todo('can infinite scroll');
});
