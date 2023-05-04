import {assertHTML, assertPosition, assertSelection, focusEditor, html, initialize, insertCard} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Plus button', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test.describe('with caret', function () {
        test('appears on empty editor', async function ({page}) {
            await focusEditor(page);
            expect(await page.locator('[data-kg-plus-button]')).not.toBeNull();
        });

        test('moves when selection moves between empty paragraphs', async function ({page}) {
            await focusEditor(page);

            // expect button to be positioned for first paragraph
            const firstPara = await page.locator('[data-lexical-editor] > p');
            const firstParaRect = await firstPara.boundingBox();
            await assertPosition(page, '[data-kg-plus-button]', {y: firstParaRect.y}, {threshold: 5});

            await page.keyboard.press('Enter');

            // expect button to be positioned for second paragraph
            const secondPara = await page.locator('[data-lexical-editor] > p:nth-of-type(2)');
            const secondParaRect = await secondPara.boundingBox();
            await assertPosition(page, '[data-kg-plus-button]', {y: secondParaRect.y}, {threshold: 5});

            await page.keyboard.press('ArrowUp');

            // expect button to be positioned for first paragraph
            await assertPosition(page, '[data-kg-plus-button]', {y: firstParaRect.y}, {threshold: 5});
        });

        test('disappears when starting to type', async function ({page}) {
            await focusEditor(page);
            expect(await page.locator('[data-kg-plus-button]')).not.toBeNull();

            await page.keyboard.type('t');
            await expect(await page.locator('[data-kg-plus-button]')).toHaveCount(0);
        });

        test('does not appear on list sections', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('- ');

            // sanity checks for expected editor state
            await assertHTML(page, html`
                <ul>
                    <li value="1"><br></li>
                </ul>
            `);
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0, 0],
                focusOffset: 0,
                focusPath: [0, 0]
            });

            await expect(await page.locator('[data-kg-plus-button]')).toHaveCount(0);
        });

        test('is shown after deleting all paragraph contents', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('t');

            await expect(await page.locator('[data-kg-plus-button]')).toHaveCount(0);

            await page.keyboard.press('Backspace');
            await page.waitForSelector('p > br', {state: 'attached'});

            expect(await page.locator('[data-kg-plus-button]')).not.toBeNull();
        });
    });

    test.describe('with mouse movement', async function () {
        test('appears over blank paragraphs', async function ({page}) {
            await expect(await page.locator('[data-kg-plus-button]')).toHaveCount(0);

            const pHandle = await page.locator('[data-lexical-editor] > p');
            await pHandle.hover();

            expect(await page.locator('[data-kg-plus-button]')).not.toBeNull();
        });

        test('moves when mouse moves', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');

            const firstPHandle = await page.locator('[data-lexical-editor] > p').nth(2);
            const firstPHandleBox = await firstPHandle.boundingBox();
            await firstPHandle.hover();

            await assertPosition(page, '[data-kg-plus-button]', {y: firstPHandleBox.y}, {threshold: 5});

            const secondPHandle = await page.locator('[data-lexical-editor] > p:nth-of-type(2)');
            const secondPHandleBox = await secondPHandle.boundingBox();
            await secondPHandle.hover();

            await assertPosition(page, '[data-kg-plus-button]', {y: secondPHandleBox.y}, {threshold: 5});
        });

        test('does not appear over populated paragraphs', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('Testing');

            await expect(await page.locator('[data-kg-plus-button]')).toHaveCount(0);

            const firstPHandle = await page.locator('[data-lexical-editor] > p').nth(0);
            await firstPHandle.hover();

            expect(await page.locator('[data-kg-plus-button]')).not.toBeNull();

            const secondPHandle = await page.locator('[data-lexical-editor] > p:nth-of-type(2)');
            await secondPHandle.hover();

            await expect(await page.locator('[data-kg-plus-button]')).toHaveCount(0);
        });

        test('does not appear over list sections', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.press('Enter');

            expect(await page.locator('[data-kg-plus-button]')).not.toBeNull();

            await page.keyboard.type('- ');

            await expect(await page.locator('[data-kg-plus-button]')).toHaveCount(0);

            const pHandle = await page.locator('[data-lexical-editor] > p');
            await pHandle.hover();

            expect(await page.locator('[data-kg-plus-button]')).not.toBeNull();

            const listHandle = await page.locator('[data-lexical-editor] li');
            await listHandle.hover();

            await expect(await page.locator('[data-kg-plus-button]')).toHaveCount(0);
        });

        test('disappears from hovered p when typing on focused p', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.press('Enter');

            const firstPHandle = await page.locator('[data-lexical-editor] > p').nth(0);
            await firstPHandle.hover();

            expect(await page.locator('[data-kg-plus-button]')).not.toBeNull();

            await page.keyboard.type('T');

            await expect(await page.locator('[data-kg-plus-button]')).toHaveCount(0);
        });

        test('returns to caret position when over non-empty element', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('Testing');
            await page.keyboard.press('Enter');

            const pHandle1 = await page.locator('[data-lexical-editor] > p:nth-of-type(1)');
            const pHandle2 = await page.locator('[data-lexical-editor] > p:nth-of-type(2)');
            const pHandle3 = await page.locator('[data-lexical-editor] > p:nth-of-type(3)');

            const pHandle1Box = await pHandle1.boundingBox();
            const pHandle3Box = await pHandle3.boundingBox();

            await assertPosition(page, '[data-kg-plus-button]', {y: pHandle3Box.y}, {threshold: 5});

            await pHandle1.hover();

            await assertPosition(page, '[data-kg-plus-button]', {y: pHandle1Box.y}, {threshold: 5});

            await pHandle2.hover();

            await assertPosition(page, '[data-kg-plus-button]', {y: pHandle3Box.y}, {threshold: 5});
        });

        test('does not appear over an empty paragraph in a card', async function ({page}) {
            await focusEditor(page);
            await insertCard(page, {cardName: 'callout'});

            await expect(page.locator('[data-kg-plus-button]')).not.toBeVisible();

            await page.locator('[data-kg-card="callout"] [data-lexical-editor] p').hover();

            await expect(page.locator('[data-kg-plus-button]')).not.toBeVisible();
        });
    });

    test.describe('menu', function () {
        test('opens on button click', async function ({page}) {
            await focusEditor(page);
            await expect(await page.locator('[data-kg-plus-menu]')).toHaveCount(0);
            await page.click('[data-kg-plus-button]');
            expect(await page.locator('[data-kg-plus-menu]')).not.toBeNull();
        });

        test('closes on click outside', async function ({page}) {
            await focusEditor(page);
            await page.click('[data-kg-plus-button]');
            expect(await page.locator('[data-kg-plus-menu]')).not.toBeNull();
            await page.click('.koenig-lexical');
            await expect(await page.locator('[data-kg-plus-menu]')).toHaveCount(0);
        });

        test('does not close on click inside', async function ({page}) {
            await focusEditor(page);
            await page.click('[data-kg-plus-button]');
            await page.click('[data-kg-plus-menu] [role="separator"] > span');
            expect(await page.locator('[data-kg-plus-menu]')).not.toBeNull();
        });

        test('closes on escape', async function ({page}) {
            await focusEditor(page);
            await page.click('[data-kg-plus-button]');
            expect(await page.locator('[data-kg-plus-menu]')).not.toBeNull();
            await page.keyboard.press('Escape');
            await expect(await page.locator('[data-kg-plus-menu]')).toHaveCount(0);
        });

        test('does not move on empty p mouseover when open', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');

            const p1 = await page.locator('[data-lexical-editor] > p:nth-of-type(1)');
            const p3 = await page.locator('[data-lexical-editor] > p:nth-of-type(3)');
            const p3Box = await p3.boundingBox();

            await assertPosition(page, '[data-kg-plus-button]', {y: p3Box.y}, {threshold: 5});

            await page.click('[data-kg-plus-button]');

            expect(await page.locator('[data-kg-plus-menu]')).not.toBeNull();
            await assertPosition(page, '[data-kg-plus-menu]', {y: p3Box.y}, {threshold: 5});

            await p1.hover();

            await assertPosition(page, '[data-kg-plus-button]', {y: p3Box.y}, {threshold: 5});
            await assertPosition(page, '[data-kg-plus-menu]', {y: p3Box.y}, {threshold: 5});
        });

        test('moves cursor when opening', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.press('Enter');

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1],
                focusOffset: 0,
                focusPath: [1]
            });

            const p1 = await page.locator('[data-lexical-editor] > p:nth-of-type(1)');
            await p1.hover();
            await page.click('[data-kg-plus-button]');

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });
        });

        test('closes when typing', async function ({page}) {
            await focusEditor(page);
            await page.click('[data-kg-plus-button]');
            expect(await page.locator('[data-kg-plus-menu]')).not.toBeNull();

            await page.keyboard.type('Test');
            await expect(await page.locator('[data-kg-plus-menu]')).toHaveCount(0);
            expect(await page.$eval('[data-lexical-editor] > p', p => p.innerText))
                .toBe('Test');
        });

        test('closes and moves focus on up/down', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.click('[data-kg-plus-button]');
            expect(await page.locator('[data-kg-plus-menu]')).not.toBeNull();

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1],
                focusOffset: 0,
                focusPath: [1]
            });

            await page.keyboard.press('ArrowUp');

            await expect(await page.locator('[data-kg-plus-menu]')).toHaveCount(0);
            expect(await page.locator('[data-kg-plus-button]')).not.toBeNull();

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });

            const p1 = await page.locator('[data-lexical-editor] > p').first();
            const p1Box = await p1.boundingBox();
            await assertPosition(page, '[data-kg-plus-button]', {y: p1Box.y}, {threshold: 5});
        });

        test('inserts card and closes menu when card item clicked', async function ({page}) {
            await focusEditor(page);
            await page.click('[data-kg-plus-button]');
            await page.click('[data-kg-card-menu-item="Divider"]');

            await expect(await page.locator('[data-kg-plus-menu]')).toHaveCount(0);

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1],
                focusOffset: 0,
                focusPath: [1]
            });
        });

        test('deselects a selected card when plus button is clicked', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.click('[data-kg-card="horizontalrule"]');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            const pHandle = await page.locator('[data-lexical-editor] > p').nth(0);
            await pHandle.hover();
            await page.click('[data-kg-plus-button]');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);
        });

        test('exits a card\'s edit mode when plus button is clicked', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('/');
            await page.click('[data-kg-card-menu-item="Markdown"]');
            await page.waitForSelector('[data-kg-card="markdown"] .CodeMirror');
            await page.keyboard.type('# Test');

            const pHandle = await page.locator('[data-lexical-editor] > p').nth(0);
            await pHandle.hover();
            await page.click('[data-kg-plus-button]');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div><svg></svg></div>
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="markdown">
                    </div>
                </div>
                <p><br /></p>
            `, {ignoreCardContents: true});
        });
    });
});
