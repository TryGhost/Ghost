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
        await page.keyboard.type('testing');

        expect(await page.$('[data-kg-plus-button]')).toBeNull();

        await page.evaluate(() => document.execCommand('selectAll', false, null));
        await page.keyboard.press('Backspace');
        await assertHTML(page, html`<p><br /></p>`);
        await page.waitForSelector('[data-kg-plus-button]');
    });
});
