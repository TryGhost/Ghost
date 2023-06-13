import {assertHTML, focusEditor, html, initialize, isMac} from '../utils/e2e';
import {test} from '@playwright/test';

test.describe('Editor text formatting keyboard shortcuts', async () => {
    let page;
    const ctrlOrCmd = isMac() ? 'Meta' : 'Control';

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('text formatting shortcuts', function () {
        test('bold', async function () {
            await focusEditor(page);

            await page.keyboard.type('test');

            await page.keyboard.down('Shift');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.up('Shift', {delay: 100});

            await page.keyboard.press(`${ctrlOrCmd}+B`, {delay: 100});

            await assertHTML(page, html`<p dir=\"ltr\"><strong data-lexical-text=\"true\">test</strong></p>`);
        });

        test('italic', async function () {
            await focusEditor(page);

            await page.keyboard.type('test');

            await page.keyboard.down('Shift');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.up('Shift', {delay: 100});

            await page.keyboard.press(`${ctrlOrCmd}+I`, {delay: 100});

            await assertHTML(page, html`<p dir=\"ltr\"><em data-lexical-text=\"true\">test</em></p>`);
        });

        test('strikethrough', async function () {
            await focusEditor(page);

            await page.keyboard.type('test');

            await page.keyboard.down('Shift');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.up('Shift', {delay: 100});

            await page.keyboard.press(`${ctrlOrCmd}+Alt+U`, {delay: 100});

            await assertHTML(page, html`<p dir=\"ltr\"><span data-lexical-text=\"true\" class="line-through">test</span></p>`);
        });

        test('link', async function () {
            await focusEditor(page);

            await page.keyboard.type('test');

            await page.keyboard.down('Shift');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.up('Shift', {delay: 100});

            await page.keyboard.press(`${ctrlOrCmd}+K`, {delay: 100});

            await page.keyboard.type('https://example.com');
            await page.keyboard.press('Enter');

            await assertHTML(page, html`
            <p dir="ltr">
                <a href="https://example.com" rel="noopener" dir="ltr">
                    <span data-lexical-text="true">test</span>
                </a>
            </p>`);
        });

        test('inline code', async function () {
            await focusEditor(page);

            await page.keyboard.type('test');

            await page.keyboard.down('Shift');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.up('Shift', {delay: 100});

            await page.keyboard.press(`${ctrlOrCmd}+Shift+K`, {delay: 100});

            await assertHTML(page, html`<p dir=\"ltr\"><code data-lexical-text=\"true\"><span>test</span></code></p>`);
        });

        // TODO : these are currently missing from the editor

        // test('blockquote', async function () {
        //     await focusEditor(page);

        //     await page.keyboard.type('test');

        //     await page.keyboard.down('Shift');
        //     await page.keyboard.press('ArrowLeft');
        //     await page.keyboard.press('ArrowLeft');
        //     await page.keyboard.press('ArrowLeft');
        //     await page.keyboard.press('ArrowLeft');
        //     await page.keyboard.up('Shift', {delay: 100});

        //     await page.keyboard.press('Meta+B', {delay: 100});

        //     // no extra paragraph created
        //     await assertHTML(page, html`
        //         "<p dir=\"ltr\"><strong data-lexical-text=\"true\">B</strong></p>"
        //     `);
        // });

        // test('header (h2)', async function () {
        //     await focusEditor(page);

        //     await page.keyboard.type('test');

        //     await page.keyboard.down('Shift');
        //     await page.keyboard.press('ArrowLeft');
        //     await page.keyboard.press('ArrowLeft');
        //     await page.keyboard.press('ArrowLeft');
        //     await page.keyboard.press('ArrowLeft');
        //     await page.keyboard.up('Shift', {delay: 100});

        //     await page.keyboard.press('Meta+B', {delay: 100});

        //     // no extra paragraph created
        //     await assertHTML(page, html`
        //         "<p dir=\"ltr\"><strong data-lexical-text=\"true\">B</strong></p>"
        //     `);
        // });
    });
});
