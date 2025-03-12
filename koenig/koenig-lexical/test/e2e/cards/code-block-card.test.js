import {assertHTML, focusEditor, html, initialize, isMac, pasteText} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Code Block card', async () => {
    const ctrlOrCmd = isMac() ? 'Meta' : 'Control';
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

    test('can import serialized code block card nodes', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
            root: {
                children: [{
                    type: 'codeblock',
                    code: '<script></script>',
                    language: 'javascript',
                    caption: 'A code block'
                }],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        }));

        await initialize({page, uri: `/#/?content=${contentParam}`});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="codeblock">
                    <div>
                        <pre><code>&lt;script&gt;&lt;/script&gt;</code></pre>
                        <div><span>javascript</span></div>
                    </div>
                    <figcaption>
                        <div data-kg-allow-clickthrough="true">
                            <div>
                                <div data-kg="editor">
                                    <div
                                        contenteditable="true"
                                        role="textbox"
                                        spellcheck="true"
                                        data-lexical-editor="true">
                                        <p dir="ltr">
                                            <span data-lexical-text="true">A code block</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </figcaption>
                </div>
            </div>
        `, {ignoreCardContents: false});
    });

    test.describe('shortcuts', () => {
        test('renders with ``` + space', async function () {
            await focusEditor(page);
            await page.keyboard.type('``` ');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="codeblock">
                    </div>
                </div>
            `, {ignoreCardContents: true});
        });

        test('renders with ```lang + space', async function () {
            await focusEditor(page);
            await page.keyboard.type('```javascript ');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="codeblock">
                    </div>
                </div>
            `, {ignoreCardContents: true});
        });

        test('renders with ``` + enter', async function () {
            await focusEditor(page);
            await page.keyboard.type('```');
            await page.keyboard.press('Enter');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="codeblock">
                    </div>
                </div>
            `, {ignoreCardContents: true});
        });

        test('renders with ```lang + enter', async function () {
            await focusEditor(page);
            await page.keyboard.type('```javascript');
            await page.keyboard.press('Enter');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="codeblock">
                    </div>
                </div>
            `, {ignoreCardContents: true});
        });
    });

    test('renders with ``` + tab', async function () {
        await focusEditor(page);
        await page.keyboard.type('```');
        await page.keyboard.press('Tab');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="codeblock">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('renders with ```lang + tab', async function () {
        await focusEditor(page);
        await page.keyboard.type('```javascript');
        await page.keyboard.press('Tab');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="codeblock">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('it hides the language input when typing in the code editor and shows it when the mouse moves', async function () {
        await focusEditor(page);
        await page.keyboard.type('```javascript ');
        await page.waitForSelector('[data-kg-card="codeblock"] .cm-editor');

        // Type in the editor
        await page.keyboard.type('Here are some words');

        const languageInput = await page.locator('[data-testid="code-card-language"]');

        // The language input should be hidden
        await expect(languageInput).toHaveClass(/opacity-0/);
        await expect(languageInput).not.toHaveClass(/opacity-100/);

        // Move the mouse
        await page.mouse.move(0,0);
        await page.mouse.move(100,100);

        // The language input should be visible
        await expect(languageInput).toHaveClass(/opacity-100/);
        await expect(languageInput).not.toHaveClass(/opacity-0/);
    });

    test('can undo/redo without losing caption', async function () {
        await focusEditor(page);
        await page.keyboard.type('```javascript ');
        await page.waitForSelector('[data-kg-card="codeblock"] .cm-editor');

        await page.keyboard.type('Here are some words');
        await page.keyboard.press('Escape');
        await page.click('[data-testid="codeblock-caption"]');
        await page.keyboard.type('My caption');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');
        await page.keyboard.press(`${ctrlOrCmd}+z`);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="codeblock">
                    <div>
                        <pre><code>Here are some words</code></pre>
                        <div><span>javascript</span></div>
                    </div>
                    <figcaption>
                        <div data-kg-allow-clickthrough="true">
                            <div>
                                <div data-kg="editor">
                                    <div
                                        contenteditable="true"
                                        role="textbox"
                                        spellcheck="true"
                                        data-lexical-editor="true">
                                        <p dir="ltr">
                                            <span data-lexical-text="true">My caption</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </figcaption>
                    <div data-kg-card-toolbar="button"></div>
                </div>
            </div>
        `, {ignoreCardContents: false, ignoreCardToolbarContents: true});
    });

    test('can undo/redo content in code editor', async function () {
        await focusEditor(page);
        await page.keyboard.type('```javascript ');
        await page.waitForSelector('[data-kg-card="codeblock"] .cm-editor');

        await pasteText(page, 'Here are some words');
        await expect(page.getByText('Here are some words')).toBeVisible();
        await page.keyboard.press('Backspace');
        await expect(page.getByText('Here are some word')).toBeVisible();
        await page.keyboard.press(`${ctrlOrCmd}+z`);
        await expect(page.getByText('Here are some words')).toBeVisible();
        await page.keyboard.press('Escape');
        await page.click('[data-testid="codeblock-caption"]');
        await page.keyboard.type('My caption');
        await page.keyboard.press('Backspace');
        await page.keyboard.press(`${ctrlOrCmd}+z`);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="codeblock">
                    <div>
                        <pre><code>Here are some words</code></pre>
                        <div><span>javascript</span></div>
                    </div>
                    <figcaption>
                        <div data-kg-allow-clickthrough="true">
                            <div>
                                <div data-kg="editor">
                                    <div
                                        contenteditable="true"
                                        role="textbox"
                                        spellcheck="true"
                                        data-lexical-editor="true">
                                        <p dir="ltr">
                                            <span data-lexical-text="true">My caption</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </figcaption>
                    <div data-kg-card-toolbar="button"></div>
                </div>
            </div>
        `, {ignoreCardContents: false, ignoreCardToolbarContents: true});
    });

    test('goes into display mode when losing focus', async function () {
        await focusEditor(page);
        await page.keyboard.type('```javascript ');
        await page.waitForSelector('[data-kg-card="codeblock"] .cm-editor');

        await page.keyboard.type('Here are some words');
        await page.getByTestId('post-title').click();
        await page.keyboard.type('post title'); // click outside of the editor

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="codeblock">
                    <div>
                        <pre><code>Here are some words</code></pre>
                        <div><span>javascript</span></div>
                    </div>
                </div>
            </div>
        `);
    });

    test('can cut text', async function () {
        await focusEditor(page);
        await page.keyboard.type('```javascript');
        await page.keyboard.press('Enter');
        await page.waitForSelector('[data-kg-card="codeblock"] .cm-editor');

        await page.keyboard.type('const test = true;');

        for (let i = 0; i < 8; i++) {
            await page.keyboard.press('ArrowLeft');
        }

        // select "test" - highlight plugin marks it and causes issues with .closest('.cm-editor') in shouldIgnoreEvent()
        // see https://github.com/TryGhost/Product/issues/3785
        await page.keyboard.down('Shift');
        for (let i = 0; i < 4; i++) {
            await page.keyboard.press('ArrowLeft');
        }
        await page.keyboard.up('Shift');

        await page.keyboard.press(`${ctrlOrCmd}+x`);

        await assertHTML(page, html`
            <div>
                <span>const</span>
                = true;
            </div>
        `, {selector: '.cm-content'});

        // NOTE: for some reason CodeMirror+Playwright don't work well together and cut/copied content
        // doesn't make it to the clipboard to enable testing that we can re-paste the cut content
    });
});
