import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {startApp, initialize, focusEditor, assertHTML, html, assertSelection} from '../utils/e2e';

describe('Slash menu', async () => {
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

    describe('open/close', function () {
        it('opens with / on blank paragraph', async function () {
            await focusEditor(page);
            expect(await page.$('[data-kg-slash-menu]')).toBeNull();
            await page.keyboard.type('/');
            expect(await page.$('[data-kg-slash-menu]')).not.toBeNull();
        });

        it('opens with / on paragraph that is entirely selected', async function () {
            await focusEditor(page);
            await page.keyboard.type('testing');

            const paragraph = await page.$('[data-lexical-editor] > p');
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

            expect(await page.$('[data-kg-slash-menu]')).not.toBeNull();
        });

        it('does not open with / on populated paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('testing');
            await page.keyboard.type('/');

            expect(await page.$('[data-kg-slash-menu]')).toBeNull();

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

            expect(await page.$('[data-kg-slash-menu]')).toBeNull();
        });

        it('closes when / deleted', async function () {
            await focusEditor(page);
            await page.keyboard.type('/');

            expect(await page.$('[data-kg-slash-menu]')).not.toBeNull();

            await page.keyboard.press('Backspace');

            expect(await page.$('[data-kg-slash-menu]')).toBeNull();
        });

        it('closes on Escape', async function () {
            await focusEditor(page);
            await page.keyboard.type('/');
            await page.keyboard.press('Escape');

            expect(await page.$('[data-kg-slash-menu]')).toBeNull();

            await assertSelection(page, {
                anchorOffset: 1,
                anchorPath: [0, 0, 0],
                focusOffset: 1,
                focusPath: [0, 0, 0]
            });
        });

        it('closes on click outside menu', async function () {
            await focusEditor(page);
            await page.keyboard.type('/');
            await page.click('body');

            expect(await page.$('[data-kg-slash-menu]')).toBeNull();
        });

        it('does not close on click inside menu', async function () {
            await focusEditor(page);
            await page.keyboard.type('/');
            await page.click('[data-kg-slash-menu] [role="separator"] > span'); // better selector for menu headings?

            expect(await page.$('[data-kg-slash-menu]')).not.toBeNull();
        });

        it('closes on cursor movement to another section', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('/');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });

            expect(await page.$('[data-kg-slash-menu]')).toBeNull();
        });

        it('does not re-open when cursor placed back on /', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('/');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('ArrowRight');

            await assertSelection(page, {
                anchorOffset: 1,
                anchorPath: [1, 0, 0],
                focusOffset: 1,
                focusPath: [1, 0, 0]
            });

            expect(await page.$('[data-kg-slash-menu]')).toBeNull();
        });
    });
});
