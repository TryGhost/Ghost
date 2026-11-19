import {expect, test} from '@playwright/test';
import {focusEditor, initialize, insertCard, selectBackwards} from '../utils/e2e';

async function setEditable(page, editable) {
    await page.evaluate((value) => {
        window.lexicalEditor.setEditable(value);
    }, editable);
}

test.describe('Read-only', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page});
    });

    // the page is shared, and the other tests need an editable editor
    test.afterEach(async () => {
        await setEditable(page, true);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('takes no typing', async function () {
        await focusEditor(page);
        await page.keyboard.type('before');

        await setEditable(page, false);
        await page.keyboard.type(' after');

        await expect(page.locator('[data-lexical-editor] > p')).toHaveText('before');
    });

    test('closes the format toolbar and offers it again once editable', async function () {
        await focusEditor(page);
        await page.keyboard.type('text for selection');
        await selectBackwards(page, 'for selection'.length);
        await expect(page.locator('[data-kg-floating-toolbar]')).toBeVisible();

        await setEditable(page, false);
        await expect(page.locator('[data-kg-floating-toolbar]')).toHaveCount(0);

        // locking cleared the selection, so the caret comes back with a click
        await setEditable(page, true);
        await page.locator('[data-lexical-editor] > p').click();
        await page.keyboard.press('End');
        await selectBackwards(page, 'for selection'.length);
        await expect(page.locator('[data-kg-floating-toolbar]')).toBeVisible();
    });

    test('shows no plus button', async function () {
        await focusEditor(page);
        await expect(page.locator('[data-kg-plus-button]')).toBeVisible();

        await setEditable(page, false);

        await expect(page.locator('[data-kg-plus-button]')).toHaveCount(0);
    });

    test('closes a card that was being edited and takes no input in it', async function () {
        await focusEditor(page);
        const card = await insertCard(page, {cardName: 'callout'});
        await page.keyboard.type('Card text');
        await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
        await expect(page.locator('[data-kg-settings-panel]')).toBeVisible();

        await setEditable(page, false);

        await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        await expect(card).toHaveAttribute('data-kg-card-selected', 'false');
        await expect(page.locator('[data-kg-settings-panel]')).toHaveCount(0);
        await expect(card.locator('[data-lexical-editor]')).toHaveAttribute('contenteditable', 'false');
        await expect(card).toHaveJSProperty('inert', true);

        await page.keyboard.type(' more');
        await expect(card.locator('[data-lexical-editor]')).toHaveText('Card text');

        await setEditable(page, true);
        await expect(card).toHaveJSProperty('inert', false);
    });

    test('keeps an empty card that was selected', async function () {
        await focusEditor(page);
        const card = await insertCard(page, {cardName: 'image'});
        await expect(card).toHaveAttribute('data-kg-card-selected', 'true');

        await setEditable(page, false);

        await expect(card).toHaveAttribute('data-kg-card-selected', 'false');
        await expect(page.locator('[data-kg-card="image"]')).toHaveCount(1);
    });
});
