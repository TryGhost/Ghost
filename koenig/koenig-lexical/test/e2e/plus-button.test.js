import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {startApp, initialize, focusEditor, assertPosition, assertHTML, html, assertSelection} from '../utils/e2e';

describe('Plus button', async () => {
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

    describe('with caret', function () {
        it('appears on empty editor', async function () {
            await focusEditor(page);
            expect(await page.$('[data-kg-plus-button]')).not.toBeNull();
        });

        it('moves when selection moves between empty paragraphs', async function () {
            await focusEditor(page);

            // expect button to be positioned for first paragraph
            const firstPara = await page.$('[data-lexical-editor] > p');
            const firstParaRect = await firstPara.boundingBox();
            await assertPosition(page, '[data-kg-plus-button]', {y: firstParaRect.y}, {threshold: 5});

            await page.keyboard.press('Enter');

            // expect button to be positioned for second paragraph
            const secondPara = await page.$('[data-lexical-editor] > p:nth-of-type(2)');
            const secondParaRect = await secondPara.boundingBox();
            await assertPosition(page, '[data-kg-plus-button]', {y: secondParaRect.y}, {threshold: 5});

            await page.keyboard.press('ArrowUp');

            // expect button to be positioned for first paragraph
            await assertPosition(page, '[data-kg-plus-button]', {y: firstParaRect.y}, {threshold: 5});
        });

        it('disappears when starting to type', async function () {
            await focusEditor(page);
            expect(await page.$('[data-kg-plus-button]')).not.toBeNull();

            await page.keyboard.type('t');
            expect(await page.$('[data-kg-plus-button]')).toBeNull();
        });

        it('does not appear on list sections', async function () {
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

            expect(await page.$('[data-kg-plus-button]')).toBeNull();
        });

        it('is shown after deleting all paragraph contents', async function () {
            await focusEditor(page);
            await page.keyboard.type('t');

            expect(await page.$('[data-kg-plus-button]')).toBeNull();

            await page.keyboard.press('Backspace');
            await page.waitForSelector('p > br', {state: 'attached'});

            expect(await page.$('[data-kg-plus-button]')).not.toBeNull();
        });
    });

    describe('with mouse movement', async function () {
        it('appears over blank paragraphs', async function () {
            expect(await page.$('[data-kg-plus-button]')).toBeNull();

            const pHandle = await page.$('[data-lexical-editor] > p');
            await pHandle.hover();

            expect(await page.$('[data-kg-plus-button]')).not.toBeNull();
        });

        it('moves when mouse moves', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');

            const firstPHandle = await page.$('[data-lexical-editor] > p');
            const firstPHandleBox = await firstPHandle.boundingBox();
            await firstPHandle.hover();

            await assertPosition(page, '[data-kg-plus-button]', {y: firstPHandleBox.y}, {threshold: 5});

            const secondPHandle = await page.$('[data-lexical-editor] > p:nth-of-type(2)');
            const secondPHandleBox = await secondPHandle.boundingBox();
            await secondPHandle.hover();

            await assertPosition(page, '[data-kg-plus-button]', {y: secondPHandleBox.y}, {threshold: 5});
        });

        it('does not appear over populated paragraphs', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('Testing');

            expect(await page.$('[data-kg-plus-button]')).toBeNull();

            const firstPHandle = await page.$('[data-lexical-editor] > p');
            await firstPHandle.hover();

            expect(await page.$('[data-kg-plus-button]')).not.toBeNull();

            const secondPHandle = await page.$('[data-lexical-editor] > p:nth-of-type(2)');
            await secondPHandle.hover();

            expect(await page.$('[data-kg-plus-button]')).toBeNull();
        });

        it('does not appear over list sections', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');

            expect(await page.$('[data-kg-plus-button]')).not.toBeNull();

            await page.keyboard.type('- ');

            expect(await page.$('[data-kg-plus-button]')).toBeNull();

            const pHandle = await page.$('[data-lexical-editor] > p');
            await pHandle.hover();

            expect(await page.$('[data-kg-plus-button]')).not.toBeNull();

            const listHandle = await page.$('[data-lexical-editor] li');
            await listHandle.hover();

            expect(await page.$('[data-kg-plus-button]')).toBeNull();
        });

        it('disappears from hovered p when typing on focused p', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');

            const firstPHandle = await page.$('[data-lexical-editor] > p');
            await firstPHandle.hover();

            expect(await page.$('[data-kg-plus-button]')).not.toBeNull();

            await page.keyboard.type('T');

            expect(await page.$('[data-kg-plus-button]')).toBeNull();
        });

        it('returns to caret position when over non-empty element', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('Testing');
            await page.keyboard.press('Enter');

            const pHandle1 = await page.$('[data-lexical-editor] > p:nth-of-type(1)');
            const pHandle2 = await page.$('[data-lexical-editor] > p:nth-of-type(2)');
            const pHandle3 = await page.$('[data-lexical-editor] > p:nth-of-type(3)');

            const pHandle1Box = await pHandle1.boundingBox();
            const pHandle3Box = await pHandle3.boundingBox();

            await assertPosition(page, '[data-kg-plus-button]', {y: pHandle3Box.y}, {threshold: 5});

            await pHandle1.hover();

            await assertPosition(page, '[data-kg-plus-button]', {y: pHandle1Box.y}, {threshold: 5});

            await pHandle2.hover();

            await assertPosition(page, '[data-kg-plus-button]', {y: pHandle3Box.y}, {threshold: 5});
        });
    });

    describe('menu', function () {
        it('opens on button click', async function () {
            await focusEditor(page);
            expect(await page.$('[data-kg-plus-menu]')).toBeNull();
            await page.click('[data-kg-plus-button]');
            expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        });

        it('closes on click outside', async function () {
            await focusEditor(page);
            await page.click('[data-kg-plus-button]');
            expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
            await page.click('.koenig-lexical');
            expect(await page.$('[data-kg-plus-menu]')).toBeNull();
        });

        it('does not close on click inside', async function () {
            await focusEditor(page);
            await page.click('[data-kg-plus-button]');
            await page.click('[data-kg-plus-menu] [role="separator"] > span');
            expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
        });

        it('closes on escape', async function () {
            await focusEditor(page);
            await page.click('[data-kg-plus-button]');
            expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
            await page.keyboard.press('Escape');
            expect(await page.$('[data-kg-plus-menu]')).toBeNull();
        });

        it('does not move on empty p mouseover when open', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');

            const p1 = await page.$('[data-lexical-editor] > p:nth-of-type(1)');
            const p3 = await page.$('[data-lexical-editor] > p:nth-of-type(3)');
            const p3Box = await p3.boundingBox();

            await assertPosition(page, '[data-kg-plus-button]', {y: p3Box.y}, {threshold: 5});

            await page.click('[data-kg-plus-button]');

            expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();
            await assertPosition(page, '[data-kg-plus-menu]', {y: p3Box.y}, {threshold: 5});

            await p1.hover();

            await assertPosition(page, '[data-kg-plus-button]', {y: p3Box.y}, {threshold: 5});
            await assertPosition(page, '[data-kg-plus-menu]', {y: p3Box.y}, {threshold: 5});
        });

        it('moves cursor when opening', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1],
                focusOffset: 0,
                focusPath: [1]
            });

            const p1 = await page.$('[data-lexical-editor] > p:nth-of-type(1)');
            await p1.hover();
            await page.click('[data-kg-plus-button]');

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });
        });

        it('closes when typing', async function () {
            await focusEditor(page);
            await page.click('[data-kg-plus-button]');
            expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();

            await page.keyboard.type('Test');
            expect(await page.$('[data-kg-plus-menu]')).toBeNull();
            expect(await page.$eval('[data-lexical-editor] > p', p => p.innerText))
                .toBe('Test');
        });

        it('closes and moves focus on up/down', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.click('[data-kg-plus-button]');
            expect(await page.$('[data-kg-plus-menu]')).not.toBeNull();

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1],
                focusOffset: 0,
                focusPath: [1]
            });

            await page.keyboard.press('ArrowUp');

            expect(await page.$('[data-kg-plus-menu]')).toBeNull();
            expect(await page.$('[data-kg-plus-button]')).not.toBeNull();

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });

            const p1 = await page.$('[data-lexical-editor] > p');
            const p1Box = await p1.boundingBox();
            await assertPosition(page, '[data-kg-plus-button]', {y: p1Box.y}, {threshold: 5});
        });

        it('inserts card and closes menu when card item clicked', async function () {
            await focusEditor(page);
            await page.click('[data-kg-plus-button]');
            await page.click('[data-kg-card-menu-item="Divider"]');

            expect(await page.$('[data-kg-plus-menu]')).toBeNull();

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
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

        it('deselects a selected card when plus button is clicked', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.click('[data-kg-card="horizontalrule"]');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
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
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);
        });

        it('exits a card\'s edit mode when plus button is clicked', async function () {
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
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="markdown">
                    </div>
                </div>
                <p><br /></p>
            `, {ignoreCardContents: true});
        });
    });
});
