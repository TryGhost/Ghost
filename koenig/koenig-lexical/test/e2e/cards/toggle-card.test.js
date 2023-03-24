import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, focusEditor, html, initialize, startApp} from '../../utils/e2e';

describe('Toggle card', async () => {
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

    test('can import serialized toggle card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'toggle',
                        header: 'Header',
                        content: 'Content'
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
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="toggle">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('renders toggle card node from slash command', async function () {
        await focusEditor(page);
        await page.keyboard.type('/toggle');
        await page.keyboard.press('Enter');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="toggle"></div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });
});