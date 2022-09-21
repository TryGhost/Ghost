import {afterAll, beforeAll, beforeEach, describe, expect, it, test} from 'vitest';
import {start, initialize, focusEditor, assertHTML, html} from '../utils/e2e';

describe('Floating format toolbar', async () => {
    let app;
    let page;

    beforeAll(async () => {
        ({app, page} = await start());
    });

    afterAll(async () => {
        await app.stop();
    });

    beforeEach(async () => {
        await initialize({page});
    });

    it('appears on text selection', async function () {
        await focusEditor(page);
        await page.keyboard.type('text for selection');

        expect(await page.$('[data-kg-floating-toolbar]')).toBeNull();

        await page.keyboard.down('Shift');
        for (let i = 0; i < 'for selection'.length; i++) {
            await page.keyboard.press('ArrowLeft');
        }
        await page.keyboard.up('Shift');

        expect(await page.$('[data-kg-floating-toolbar]')).not.toBeNull();
    });

    it('disappears on selection removal', async function () {
        await focusEditor(page);
        await page.keyboard.type('text for selection');
        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.up('Shift');

        expect(await page.$('[data-kg-floating-toolbar]')).not.toBeNull();

        await page.keyboard.press('ArrowRight');

        expect(await page.$('[data-kg-floating-toolbar]')).toBeNull();
    });

    describe('buttons', function () {
        const BASIC_TOGGLES = [{
            button: 'bold',
            html: html`
                <p dir="ltr">
                    <span data-lexical-text="true">text for </span>
                    <strong data-lexical-text="true">selection</strong>
                </p>
            `
        }, {
            button: 'italic',
            html: html`
                <p dir="ltr">
                    <span data-lexical-text="true">text for </span>
                    <em class="italic" data-lexical-text="true">selection</em>
                </p>
            `
        }, {
            button: 'h2',
            html: html`
                <h2 dir="ltr"><span data-lexical-text="true">text for selection</span></h2>
            `
        }, {
            button: 'h3',
            html: html`
                <h3 dir="ltr"><span data-lexical-text="true">text for selection</span></h3>
            `
        }];

        BASIC_TOGGLES.forEach((testCase) => {
            test(`toggles ${testCase.button}`, async function () {
                await focusEditor(page);
                await page.keyboard.type('text for selection');

                await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">text for selection</span></p>`);

                await page.keyboard.down('Shift');
                for (let i = 0; i < 'selection'.length; i++) {
                    await page.keyboard.press('ArrowLeft');
                }
                await page.keyboard.up('Shift');

                const buttonSelector = `[data-kg-floating-toolbar] [data-kg-toolbar-button="${testCase.button}"] button`;
                await page.click(buttonSelector);

                await assertHTML(page, testCase.html);

                expect(await page.$eval(buttonSelector, e => e.dataset.kgActive)).toEqual('true');

                await page.click(buttonSelector);

                await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">text for selection</span></p>`);
                expect(await page.$eval(buttonSelector, e => e.dataset.kgActive)).toEqual('false');
            });
        });

        it('toggles h4 to h2', async function () {
            await focusEditor(page);
            await page.keyboard.type('#### header for selection');

            await assertHTML(page, html`<h4 dir="ltr"><span data-lexical-text="true">header for selection</span></h4>`);

            await page.keyboard.down('Shift');
            for (let i = 0; i < 'selection'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }
            await page.keyboard.up('Shift');

            const buttonSelector = `[data-kg-floating-toolbar] [data-kg-toolbar-button="h2"] button`;
            await page.click(buttonSelector);

            await assertHTML(page, html`
                <h2 dir="ltr"><span data-lexical-text="true">header for selection</span></h2>
            `);

            expect(await page.$eval(buttonSelector, e => e.dataset.kgActive)).toEqual('true');

            await page.click(buttonSelector);

            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">header for selection</span></p>`);
            expect(await page.$eval(buttonSelector, e => e.dataset.kgActive)).toEqual('false');
        });

        it('toggles h4 to h3', async function () {
            await focusEditor(page);
            await page.keyboard.type('#### header for selection');

            await assertHTML(page, html`<h4 dir="ltr"><span data-lexical-text="true">header for selection</span></h4>`);

            await page.keyboard.down('Shift');
            for (let i = 0; i < 'selection'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }
            await page.keyboard.up('Shift');

            const buttonSelector = `[data-kg-floating-toolbar] [data-kg-toolbar-button="h3"] button`;
            await page.click(buttonSelector);

            await assertHTML(page, html`
                <h3 dir="ltr"><span data-lexical-text="true">header for selection</span></h3>
            `);

            expect(await page.$eval(buttonSelector, e => e.dataset.kgActive)).toEqual('true');

            await page.click(buttonSelector);

            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">header for selection</span></p>`);
            expect(await page.$eval(buttonSelector, e => e.dataset.kgActive)).toEqual('false');
        });

        it('cycles through quote styles', async function () {
            await focusEditor(page);
            await page.keyboard.type('quote text');

            await page.keyboard.down('Shift');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.up('Shift');

            const buttonSelector = `[data-kg-floating-toolbar] [data-kg-toolbar-button="quote"] button`;
            await page.click(buttonSelector);

            await assertHTML(page, html`
                <blockquote dir="ltr">
                    <span data-lexical-text="true">quote text</span>
                </blockquote>
            `);
            expect(await page.$eval(buttonSelector, e => e.dataset.kgActive)).toEqual('true');

            await page.click(buttonSelector);

            await assertHTML(page, html`
                <aside dir="ltr">
                    <span data-lexical-text="true">quote text</span>
                </aside>
            `);
            expect(await page.$eval(buttonSelector, e => e.dataset.kgActive)).toEqual('true');

            await page.click(buttonSelector);

            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">quote text</span></p>`);
            expect(await page.$eval(buttonSelector, e => e.dataset.kgActive)).toEqual('false');
        });
    });
});
