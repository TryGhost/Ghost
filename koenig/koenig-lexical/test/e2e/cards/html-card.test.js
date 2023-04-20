import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, createSnippet, focusEditor, html, initialize, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

describe('Html card', async () => {
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

    test('can add snippet', async function () {
        await focusEditor(page);
        // insert new card
        await page.keyboard.type('/html');
        await page.waitForSelector('[data-kg-card-menu-item="HTML"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');

        // fill card
        await expect(await page.locator('[data-kg-card="html"][data-kg-card-editing="true"]')).toBeVisible();
        // waiting for html editor
        await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
        await page.keyboard.type('text in html card', {delay: 100});
        await expect(await page.getByText('text in html card')).toBeVisible();
        await page.keyboard.press('Escape');

        // create snippet
        await createSnippet(page);

        // can insert card from snippet
        await page.keyboard.press('Enter');
        await page.keyboard.type('/snippet');
        await page.waitForSelector('[data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await expect(await page.locator('[data-kg-card="html"]')).toHaveCount(2);
    });
});
