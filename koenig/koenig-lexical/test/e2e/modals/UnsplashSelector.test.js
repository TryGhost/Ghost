import {afterAll, beforeAll, beforeEach, describe, test, expect} from 'vitest';
import {startApp, initialize, focusEditor} from '../../utils/e2e';

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

    test('renders unsplash images', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        expect(await page.$('[data-kg-modal="unsplash"]')).not.toBeNull();
        expect(await page.$('[data-kg-unsplash-gallery]')).not.toBeNull();
    });

    test('can select image', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        expect(await page.$('[data-kg-modal="unsplash"]')).not.toBeNull();
        expect(await page.$('[data-kg-unsplash-gallery]')).not.toBeNull();
        await page.click('[data-kg-unsplash-gallery-item]');
        expect(await page.$('[data-kg-unsplash-zoomed]')).not.toBeNull();
    });
});
