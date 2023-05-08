import {assertHTML, focusEditor, html, initialize} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Floating format toolbar', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test('appears on text selection', async function ({page}) {
        await focusEditor(page);
        await page.keyboard.type('text for selection');

        await expect(await page.locator('[data-kg-floating-toolbar]')).toHaveCount(0);

        await page.keyboard.down('Shift');
        for (let i = 0; i < 'for selection'.length; i++) {
            await page.keyboard.press('ArrowLeft');
        }
        await page.keyboard.up('Shift');

        expect(await page.locator('[data-kg-floating-toolbar]')).not.toBeNull();
    });

    test('appears on paragraph selection', async function ({page}) {
        await focusEditor(page);
        await expect(await page.locator('[data-kg-floating-toolbar]')).toHaveCount(0);
        await test.step('Insert paragraphs', async () => {
            await page.keyboard.type('paragraph for selection');
            await page.keyboard.press('Shift+Enter');
            await page.keyboard.type('paragraph for selection');
            await page.keyboard.press('Shift+Enter');
            await page.keyboard.type('paragraph for selection');
        });

        await test.step('Move cursor to the end of first paragraph', async () => {
            await page.keyboard.press('ArrowUp');
            await page.keyboard.press('ArrowUp');
        });

        await test.step('Select paragraphs', async () => {
            await page.keyboard.down('Shift');
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.up('Shift');
        });

        await expect(await page.locator('[data-kg-floating-toolbar]')).toBeVisible();
    });

    test('disappears on selection removal', async function ({page}) {
        await focusEditor(page);
        await page.keyboard.type('text for selection');
        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.up('Shift');

        expect(await page.locator('[data-kg-floating-toolbar]')).not.toBeNull();

        await page.keyboard.press('ArrowRight');

        await expect(await page.locator('[data-kg-floating-toolbar]')).toHaveCount(0);
    });

    test.describe('buttons', function () {
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
            test(`toggles ${testCase.button}`, async function ({page}) {
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

        test('toggles h4 to h2', async function ({page}) {
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

        test('toggles h4 to h3', async function ({page}) {
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

        test('cycles through quote styles', async function ({page}) {
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

        test('can create link', async function ({page}) {
            await focusEditor(page);
            await page.keyboard.type('link');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">link</span>
                </p>
            `);

            await page.keyboard.down('Shift');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.up('Shift');

            const buttonSelector = `[data-kg-floating-toolbar] [data-kg-toolbar-button="link"] button`;
            await page.click(buttonSelector);
            await page.waitForSelector('[data-testid="link-input"]');
            await page.getByTestId('link-input').fill('https://ghost.org/');
            await page.keyboard.press('Enter');

            await assertHTML(page, html`
                <p dir="ltr">
                    <a href="https://ghost.org/" rel="noopener" dir="ltr">
                       <span data-lexical-text="true">link</span>
                    </a>
                </p>
            `);

            await page.keyboard.down('Shift');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.up('Shift');
            await page.click(buttonSelector);
            await page.waitForSelector('[data-testid="link-input"]');
            await page.getByTestId('link-input').fill('');
            await page.keyboard.press('Enter');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">link</span></p>
            `);
        });
    });
});
