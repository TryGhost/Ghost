import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, focusEditor, html, initialize, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

describe('Code Block card', async () => {
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

    test('can import serialized code block card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
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
            });
            const editor = window.lexicalEditor;
            const editorState = editor.parseEditorState(serializedState);
            editor.setEditorState(editorState);
        });

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="codeblock">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('renders code block card node', async function () {
        await focusEditor(page);
        await page.keyboard.type('```javascript ');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="codeblock">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test.only('renders code block card node 2', async function () {
        await focusEditor(page);
        await page.keyboard.type('```javascript');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Here are some words');

        // await page.pause(1000);

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
});
