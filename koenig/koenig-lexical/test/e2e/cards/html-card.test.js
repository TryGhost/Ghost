import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, focusEditor, html, initialize, isMac, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

describe('Html card', async () => {
    let app;
    let page;

    const ctrlOrCmd = isMac() ? 'Meta' : 'Control';

    beforeAll(async () => {
        ({app, page} = await startApp());
    });

    afterAll(async () => {
        await app.stop();
    });

    beforeEach(async () => {
        await initialize({page});
    });

    test('can import serialized html card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'html',
                        html: '<p>test content</p>'
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
                <div><svg></svg></div>
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="html">
                    <div><p>test content</p></div>
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('renders html card node from slash entry', async function () {
        await focusEditor(page);
        await page.keyboard.type('/html');
        await page.waitForSelector('[data-kg-card-menu-item="HTML"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div><svg></svg></div>
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="html"></div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });
});
