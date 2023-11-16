import {assertHTML, ctrlOrCmd, focusEditor, html, initialize} from '../utils/e2e';
import {test} from '@playwright/test';

test.describe('Editor keyboard shortcuts', async () => {
    const ctrlOrCmdKey = ctrlOrCmd();
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

            await page.keyboard.press(`${ctrlOrCmdKey}+B`, {delay: 100});

            await assertHTML(page, html`<p dir="ltr"><strong data-lexical-text="true">test</strong></p>`);
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

            await page.keyboard.press(`${ctrlOrCmdKey}+I`, {delay: 100});

            await assertHTML(page, html`<p dir="ltr"><em data-lexical-text="true">test</em></p>`);
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

            await page.keyboard.press(`${ctrlOrCmdKey}+Alt+U`, {delay: 100});

            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true" class="line-through">test</span></p>`);
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

            await page.keyboard.press(`${ctrlOrCmdKey}+K`, {delay: 100});

            await page.keyboard.type('https://example.com');
            await page.keyboard.press('Enter');

            await assertHTML(page, html`
            <p dir="ltr">
                <a href="https://example.com" rel="noreferrer" dir="ltr">
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

            await page.keyboard.press(`Control+Shift+K`, {delay: 100});

            await assertHTML(page, html`<p dir="ltr"><code spellcheck="false" data-lexical-text="true"><span>test</span></code></p>`);
        });

        test('highlight', async function () {
            await focusEditor(page);

            await page.keyboard.type('test');

            await page.keyboard.down('Shift');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.up('Shift', {delay: 100});

            await page.keyboard.press(`${ctrlOrCmdKey}+Alt+H`, {delay: 100});

            await assertHTML(page, html`<p dir="ltr"><mark data-lexical-text="true"><span>test</span></mark></p>`);
        });
    });

    test('quotes', async function () {
        await focusEditor(page);

        await page.keyboard.type('test');

        // paragraph -> blockquote
        await page.keyboard.press('Control+q');

        await assertHTML(page, html`
            <blockquote dir="ltr">
                <span data-lexical-text="true">test</span>
            </blockquote>
        `);

        // blockquote -> aside
        await page.keyboard.press('Control+q');

        await assertHTML(page, html`
            <aside dir="ltr">
                <span data-lexical-text="true">test</span>
            </aside>
        `);

        // aside -> paragraph
        await page.keyboard.press('Control+q');

        await assertHTML(page, html`
            <p dir="ltr"><span data-lexical-text="true">test</span></p>
        `);
    });

    test('specific heading', async function () {
        await focusEditor(page);

        await page.keyboard.type('test');

        await page.keyboard.press(`Control+Alt+1`);

        await assertHTML(page, html`
            <h1 dir="ltr"><span data-lexical-text="true">test</span></h1>
        `);

        await page.keyboard.press(`Control+Alt+2`);

        await assertHTML(page, html`
            <h2 dir="ltr"><span data-lexical-text="true">test</span></h2>
        `);

        await page.keyboard.press(`Control+Alt+3`);

        await assertHTML(page, html`
            <h3 dir="ltr"><span data-lexical-text="true">test</span></h3>
        `);

        await page.keyboard.press(`Control+Alt+4`);

        await assertHTML(page, html`
            <h4 dir="ltr"><span data-lexical-text="true">test</span></h4>
        `);

        await page.keyboard.press(`Control+Alt+5`);

        await assertHTML(page, html`
            <h5 dir="ltr"><span data-lexical-text="true">test</span></h5>
        `);

        await page.keyboard.press(`Control+Alt+6`);

        await assertHTML(page, html`
            <h6 dir="ltr"><span data-lexical-text="true">test</span></h6>
        `);

        // higher levels are ignored
        await page.keyboard.press(`Control+Alt+7`);

        await assertHTML(page, html`
            <h6 dir="ltr"><span data-lexical-text="true">test</span></h6>
        `);
    });

    test('unordered list', async function () {
        await focusEditor(page);

        await page.keyboard.type('test');
        await page.keyboard.press('Control+l');

        await assertHTML(page, html`
            <ul>
                <li value="1" dir="ltr"><span data-lexical-text="true">test</span></li>
            </ul>
        `);

        await page.keyboard.press('Control+l');

        await assertHTML(page, html`
            <p dir="ltr"><span data-lexical-text="true">test</span></p>
        `);
    });

    test('ordered list', async function () {
        await focusEditor(page);

        await page.keyboard.type('test');
        await page.keyboard.press('Control+Alt+l');

        await assertHTML(page, html`
            <ol>
                <li value="1" dir="ltr"><span data-lexical-text="true">test</span></li>
            </ol>
        `);

        await page.keyboard.press('Control+l');

        await assertHTML(page, html`
            <p dir="ltr"><span data-lexical-text="true">test</span></p>
        `);
    });
});
