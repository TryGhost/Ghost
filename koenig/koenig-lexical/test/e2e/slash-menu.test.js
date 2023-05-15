import {assertHTML, assertSelection, focusEditor, html, initialize, insertCard} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Slash menu', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test.describe('open/close', function () {
        test('opens with / on blank paragraph', async function ({page}) {
            await focusEditor(page);
            await expect(page.locator('[data-kg-slash-menu]')).not.toBeVisible();
            await page.keyboard.type('/');
            await expect(page.locator('[data-kg-slash-menu]')).toBeVisible();
        });

        test('opens with / on paragraph that is entirely selected', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('testing');

            const paragraph = await page.locator('[data-lexical-editor] > p');
            await paragraph.click({clickCount: 3});

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0, 0, 0],
                focusOffset: 7,
                focusPath: [0, 0, 0]
            });

            await page.keyboard.type('/');

            // sanity check that text was fully selected + replaced
            await assertHTML(page, html`<p><span data-lexical-text="true">/</span></p>`);

            await expect(page.locator('[data-kg-slash-menu]')).toBeVisible();
        });

        test('opens with / + SHIFT', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.down('Shift');
            await page.keyboard.type('/');
            await page.keyboard.up('Shift');
            await expect(page.locator('[data-kg-slash-menu]')).toBeVisible();
        });

        test('does not open with / on populated paragraph', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('testing');
            await page.keyboard.type('/');

            await expect(page.locator('[data-kg-slash-menu]')).not.toBeVisible();

            await page.keyboard.press('Backspace');
            for (let i = 0; i < 'testing'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0, 0, 0],
                focusOffset: 0,
                focusPath: [0, 0, 0]
            });

            await page.keyboard.type('/');

            await expect(page.locator('[data-kg-slash-menu]')).not.toBeVisible();
        });

        test('closes when / deleted', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/');

            await expect(page.locator('[data-kg-slash-menu]')).toBeVisible();

            await page.keyboard.press('Backspace');

            await expect(page.locator('[data-kg-slash-menu]')).not.toBeVisible();
        });

        test('closes on Escape', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/');
            await page.keyboard.press('Escape');

            await expect(page.locator('[data-kg-slash-menu]')).not.toBeVisible();

            await assertSelection(page, {
                anchorOffset: 1,
                anchorPath: [0, 0, 0],
                focusOffset: 1,
                focusPath: [0, 0, 0]
            });
        });

        test('closes on click outside menu', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/');
            await page.click('body');

            await expect(page.locator('[data-kg-slash-menu]')).not.toBeVisible();
        });

        test('does not close on click inside menu', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/');
            await page.click('[data-kg-slash-menu] [role="separator"] > span'); // better selector for menu headings?

            await expect(page.locator('[data-kg-slash-menu]')).toBeVisible();
        });

        test('does not re-open when cursor placed back on /', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('/');
            await page.click('body');
            await page.click('[data-lexical-editor] > p:nth-of-type(2)');

            await expect(page.locator('[data-kg-slash-menu]')).not.toBeVisible();

            // TODO: this fails in CI but passes locally
            // await assertSelection(page, {
            //     anchorOffset: 1,
            //     anchorPath: [1, 0, 0],
            //     focusOffset: 1,
            //     focusPath: [1, 0, 0]
            // });

            // Temp workaround for above to ensure the focus is in the right place
            await page.keyboard.type('words');
            await assertHTML(page, html`
                <p><br /></p>
                <p dir="ltr"><span data-lexical-text="true">/words</span></p>
            `);
        });
    });

    test.describe('filtering', function () {
        test('matches text after /', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/img');

            const menuItems = page.locator('[data-kg-slash-menu] [role="menuitem"]');
            await expect(menuItems).toHaveCount(1);

            await expect(menuItems.first()).toContainText('Image');
        });

        test('shows no menu with no matches', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/unknown');

            await expect(page.locator('[data-kg-slash-menu]')).not.toBeVisible();
        });
    });

    test.describe('selection', function () {
        test('first item is selected when opening', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/');

            const menuItems = await page.locator('[data-kg-slash-menu] [role="menuitem"]');
            await expect(menuItems.nth(0)).toHaveAttribute('data-kg-cardmenu-selected', 'true');
            await expect(menuItems.nth(1)).toHaveAttribute('data-kg-cardmenu-selected', 'false');
        });

        test('DOWN selects next item', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/');
            await page.keyboard.press('ArrowDown');

            const menuItems = await page.locator('[data-kg-slash-menu] [role="menuitem"]');
            await expect(menuItems.nth(0)).toHaveAttribute('data-kg-cardmenu-selected', 'false');
            await expect(menuItems.nth(1)).toHaveAttribute('data-kg-cardmenu-selected', 'true');
        });

        test('RIGHT selects next item', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/');
            await page.keyboard.press('ArrowRight');

            const menuItems = await page.locator('[data-kg-slash-menu] [role="menuitem"]');
            await expect(menuItems.nth(0)).toHaveAttribute('data-kg-cardmenu-selected', 'false');
            await expect(menuItems.nth(1)).toHaveAttribute('data-kg-cardmenu-selected', 'true');
        });

        test('UP selects previous item', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('ArrowUp');

            const menuItems = await page.locator('[data-kg-slash-menu] [role="menuitem"]');
            await expect(menuItems.nth(0)).toHaveAttribute('data-kg-cardmenu-selected', 'true');
            await expect(menuItems.nth(1)).toHaveAttribute('data-kg-cardmenu-selected', 'false');
        });

        test('LEFT selects previous time', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('ArrowLeft');

            const menuItems = await page.locator('[data-kg-slash-menu] [role="menuitem"]');
            await expect(menuItems.nth(0)).toHaveAttribute('data-kg-cardmenu-selected', 'true');
            await expect(menuItems.nth(1)).toHaveAttribute('data-kg-cardmenu-selected', 'false');
        });

        test('first item is selected after changing query', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.type('hr');

            const menuItems = await page.locator('[data-kg-slash-menu] [role="menuitem"]');
            await expect(menuItems.nth(0)).toHaveAttribute('data-kg-cardmenu-selected', 'true');
        });
    });

    test.describe('insertion', function () {
        test('ENTER inserts card', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/hr', {delay: 100});
            await page.keyboard.press('Enter');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1],
                focusOffset: 0,
                focusPath: [1]
            });

            await expect(page.locator('[data-kg-slash-menu]')).not.toBeVisible();
        });

        test('has correct order when inserting after text', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('Testing');
            await page.keyboard.press('Enter');
            await page.keyboard.type('/hr', {delay: 100});
            await page.keyboard.press('Enter');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);

            // HR card puts focus on paragraph after insert
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [2],
                focusOffset: 0,
                focusPath: [2]
            });
        });

        test('has correct order when inserting after a card', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/hr');
            await page.waitForSelector('li:first-child > [data-kg-card-menu-item="Divider"]');
            await page.keyboard.press('Enter');
            await page.keyboard.type('/img');
            await page.waitForSelector('li:first-child > [data-kg-card-menu-item="Image"]');
            await page.keyboard.press('Enter');

            // image card retains focus after insert
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="image"></div>
                </div>
                <p><br /></p>
            `, {ignoreCardContents: true});
        });

        test('uses query params', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/image https://example.com/image.jpg');
            await expect(await page.locator('[data-kg-card-menu-item="Image"][data-kg-cardmenu-selected="true"]')).toBeVisible();
            await page.keyboard.press('Enter');
            await expect(await page.locator('[data-kg-card="image"]')).toBeVisible();

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="image"></div>
                </div>
                <p><br /></p>
            `, {ignoreCardContents: true});

            expect(await page.evaluate(() => {
                return document.querySelector('[data-kg-card="image"] img').src;
            })).toEqual('https://example.com/image.jpg');
        });

        test('can insert card at beginning of document before text', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            // todo: flaky test, added delay for slower typing to imitate user behaviour
            // need to add retry instead of delay after migration to playwright if the problem persists
            await page.keyboard.type('Testing',{delay: 100});
            await page.keyboard.press('ArrowUp', {delay: 100});
            await insertCard(page, {cardName: 'callout'});

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="callout"></div>
                </div>
                <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
            `, {ignoreCardContents: true});
        });

        test('can insert card at beginning of document before card', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('--- ');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.press('ArrowUp');
            await insertCard(page, {cardName: 'callout'});

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="callout"></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"></div>
                </div>
                <p><br /></p>
            `, {ignoreCardContents: true});
        });
    });
});