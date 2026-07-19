import {ctrlOrCmd, focusEditor, initialize, insertCard, selectBackwards} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Selection Word Count Plugin', async function () {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('shows no selection count without a selection', async function () {
        await focusEditor(page);
        await page.keyboard.type('Hello beautiful world');
        await expect(page.getByTestId('word-count')).toHaveText('3');
        await expect(page.getByTestId('selection-word-count')).not.toBeVisible();
    });

    test('shows selection count for selected text', async function () {
        await focusEditor(page);
        await page.keyboard.type('Hello beautiful world');
        await selectBackwards(page, 5); // selects "world"
        await expect(page.getByTestId('selection-word-count')).toHaveText('1');
        // total stays visible alongside the selection count
        await expect(page.getByTestId('word-count')).toHaveText('3');

        // extend across a word boundary; selects "beautiful world"
        await selectBackwards(page, 10);
        await expect(page.getByTestId('selection-word-count')).toHaveText('2');
    });

    test('shows 0 for a whitespace-only selection', async function () {
        await focusEditor(page);
        await page.keyboard.type('Hello world');
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('ArrowLeft');
        }

        // Chrome for Testing occasionally drops the programmatic selection;
        // retry until the whitespace-only selection registers and gets counted
        await expect(async () => {
            if (!(await page.evaluate(() => window.getSelection().isCollapsed))) {
                // a previous attempt selected; collapse back to just before "world"
                await page.keyboard.press('ArrowRight');
            }
            await selectBackwards(page, 1); // selects the space between the words
            await expect(page.getByTestId('selection-word-count')).toHaveText('0', {timeout: 1000});
        }).toPass();
    });

    test('counts partial word fragments as words', async function () {
        await focusEditor(page);
        await page.keyboard.type('Hello world');
        await selectBackwards(page, 3); // selects "rld"
        await expect(page.getByTestId('selection-word-count')).toHaveText('1');
    });

    test('reverts to total-only display when selection collapses', async function () {
        await focusEditor(page);
        await page.keyboard.type('Hello world');
        await selectBackwards(page, 5);
        await expect(page.getByTestId('selection-word-count')).toHaveText('1');
        await page.keyboard.press('ArrowRight'); // collapse the selection
        await expect(page.getByTestId('selection-word-count')).not.toBeVisible();
        await expect(page.getByTestId('word-count')).toHaveText('2');
    });

    test('counts selection inside a nested editor', async function () {
        await focusEditor(page);
        await page.keyboard.type('Hello world');
        await page.keyboard.press('Enter');
        await insertCard(page, {cardName: 'callout'});
        await page.keyboard.type('Nested content here');
        await expect(page.getByTestId('word-count')).toHaveText('5');
        await selectBackwards(page, 12); // selects "content here"
        await expect(page.getByTestId('selection-word-count')).toHaveText('2');
    });

    test('moving selection from nested editor back to main editor reports main selection', async function () {
        await focusEditor(page);
        await page.keyboard.type('Hello world');
        await page.keyboard.press('Enter');
        await insertCard(page, {cardName: 'callout'});
        await page.keyboard.type('Nested content here');
        await selectBackwards(page, 4); // selects "here" in the nested editor
        await expect(page.getByTestId('selection-word-count')).toHaveText('1');

        // click into the first paragraph and select "Hello world" there
        await page.locator('[data-lexical-editor] > p').first().click();
        await page.keyboard.press('End');
        await selectBackwards(page, 11);
        await expect(page.getByTestId('selection-word-count')).toHaveText('2');

        // collapse — counter must revert to total-only, with no stale nested count
        await page.keyboard.press('ArrowRight');
        await expect(page.getByTestId('selection-word-count')).not.toBeVisible();
    });

    test('select-all across a card matches the document total', async function () {
        await focusEditor(page);
        await page.keyboard.type('Hello world');
        await page.keyboard.press('Enter');
        await insertCard(page, {cardName: 'callout'});
        await page.keyboard.type('Nested content here');
        await page.keyboard.press('Escape'); // exit nested editing, card selected
        await page.keyboard.press('ArrowDown'); // cursor into main editor below card
        await page.keyboard.press(`${ctrlOrCmd(page)}+KeyA`);
        await expect(page.getByTestId('word-count')).toHaveText('5');
        await expect(page.getByTestId('selection-word-count')).toHaveText('5');
    });
});
