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
            await page.waitForSelector('p > br');

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
});
