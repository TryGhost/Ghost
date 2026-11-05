import {assertHTML, ctrlOrCmd, focusEditor, html, initialize, selectBackwards} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Editor keyboard shortcuts', async () => {
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

            await selectBackwards(page, 4);

            await page.keyboard.press(`${ctrlOrCmd(page)}+B`);

            await assertHTML(page, html`<p dir="ltr"><strong data-lexical-text="true">test</strong></p>`);
        });

        test('italic', async function () {
            await focusEditor(page);

            await page.keyboard.type('test');

            await selectBackwards(page, 4);

            await page.keyboard.press(`${ctrlOrCmd(page)}+I`);

            await assertHTML(page, html`<p dir="ltr"><em data-lexical-text="true">test</em></p>`);
        });

        test('strikethrough', async function () {
            await focusEditor(page);

            await page.keyboard.type('test');

            await selectBackwards(page, 4);

            await page.keyboard.press(`${ctrlOrCmd(page)}+Alt+U`);

            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true" class="line-through">test</span></p>`);
        });

        test('link', async function () {
            await focusEditor(page);

            await page.keyboard.type('test');

            await selectBackwards(page, 4);

            await page.keyboard.press(`${ctrlOrCmd(page)}+K`);

            await page.waitForSelector('[data-testid="link-input"]');
            await page.getByTestId('link-input').fill('https://example.com');
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

            await selectBackwards(page, 4);

            await page.keyboard.press(`Control+Shift+K`);

            await assertHTML(page, html`<p dir="ltr"><code spellcheck="false" data-lexical-text="true"><span>test</span></code></p>`);
        });

        test('highlight', async function () {
            await focusEditor(page);

            await page.keyboard.type('test');

            await selectBackwards(page, 4);

            await page.keyboard.press(`${ctrlOrCmd(page)}+Alt+H`);

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
    test.describe('typing ` over a selection', function () {
        const getSelectedText = () => page.evaluate(() => window.getSelection().toString());
        const getEditorHTML = () => page.innerHTML('.koenig-lexical div[contenteditable="true"]');

        test('formats the selection as inline code', async function () {
            await focusEditor(page);
            await page.keyboard.type('hello world');
            await selectBackwards(page, 5);

            await page.keyboard.press('`');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">hello</span>
                    <code spellcheck="false" data-lexical-text="true"><span>world</span></code>
                </p>
            `);
            expect(await getSelectedText()).toEqual('world');
        });

        test('removes inline code from a code selection', async function () {
            await focusEditor(page);
            await page.keyboard.type('hello world');
            await selectBackwards(page, 5);

            await page.keyboard.press('`');
            await page.keyboard.press('`');

            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">hello world</span></p>`);
            expect(await getSelectedText()).toEqual('world');
        });

        test('matches ctrl shift K across paragraphs', async function () {
            const formatAcrossParagraphs = async (shortcut) => {
                await initialize({page});
                await focusEditor(page);
                await page.keyboard.type('first para');
                await page.keyboard.press('Enter');
                await page.keyboard.type('second para');
                await selectBackwards(page, 'para'.length + 1 + 'second para'.length);

                await page.keyboard.press(shortcut);

                return getEditorHTML();
            };

            const shortcutHTML = await formatAcrossParagraphs('Control+Shift+K');
            const backtickHTML = await formatAcrossParagraphs('`');

            expect(backtickHTML).toEqual(shortcutHTML);
            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">first</span>
                    <code spellcheck="false" data-lexical-text="true"><span>para</span></code>
                </p>
                <p dir="ltr">
                    <code spellcheck="false" data-lexical-text="true"><span>second para</span></code>
                </p>
            `);
        });

        test('undoes in one step back to the original selection', async function () {
            await focusEditor(page);
            await page.keyboard.type('hello world');
            await selectBackwards(page, 5);

            await page.keyboard.press('`');
            await page.keyboard.press(`${ctrlOrCmd(page)}+z`);

            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">hello world</span></p>`);
            expect(await getSelectedText()).toEqual('world');

            await page.keyboard.press(`${ctrlOrCmd(page)}+Shift+z`);

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">hello</span>
                    <code spellcheck="false" data-lexical-text="true"><span>world</span></code>
                </p>
            `);
        });

        test('types a backtick without a selection', async function () {
            await focusEditor(page);
            await page.keyboard.type('hello');

            await page.keyboard.press('`');

            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">hello\`</span></p>`);
        });

        test('leaves the code card editor alone', async function () {
            await focusEditor(page);
            await page.keyboard.type('```javascript ');
            await page.waitForSelector('[data-kg-card="codeblock"] .cm-editor');
            await page.keyboard.type('const test');
            await selectBackwards(page, 4);

            await page.keyboard.press('`');

            await expect(page.locator('[data-kg-card="codeblock"] .cm-content')).toHaveText('const `');
        });

        test('formats code card captions as inline code', async function () {
            await focusEditor(page);
            await page.keyboard.type('```javascript ');
            await page.waitForSelector('[data-kg-card="codeblock"] .cm-editor');
            await page.keyboard.type('const test');
            await page.keyboard.press('Escape');
            await page.click('[data-testid="codeblock-caption"]');
            await page.keyboard.type('My caption');
            await selectBackwards(page, 7);

            await page.keyboard.press('`');

            await expect(page.locator('[data-testid="codeblock-caption"] code')).toHaveText('caption');
        });
    });
});
