import {assertHTML, createSnippet, ctrlOrCmd, focusEditor, html, initialize} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Html card', async () => {
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
                    <div>
                        <div><p>test content</p></div>
                        <div></div>
                    </div>
                </div>
            </div>
        `, {ignoreCardContents: false});
    });

    test('renders without style elements and attributes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'html',
                        html: '<div id="fullscreen"><span style="fullscreen-inner">Loading...</span></div><style>.fullscreen {position: fixed;}</style>'
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
                    <div>
                        <div><div><span style="fullscreen-inner">Loading...</span></div></div>
                        <div></div>
                    </div>
                </div>
            </div>
        `, {ignoreCardContents: false, ignoreInlineStyles: false});
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
        await expect(page.locator('[data-kg-card="html"][data-kg-card-editing="true"]')).toBeVisible();
        // waiting for html editor
        await expect(page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
        await page.locator('[data-kg-card="html"]').click();
        await page.keyboard.type('text in html card', {delay: 100});
        await expect(page.getByText('text in html card')).toBeVisible();
        await page.keyboard.press('Escape');

        // create snippet
        await createSnippet(page);

        // can insert card from snippet
        await page.keyboard.press('Enter');
        await page.keyboard.type('/snippet');
        await page.waitForSelector('[data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-kg-card="html"]')).toHaveCount(2);
    });

    test('can undo/redo content in html editor', async function () {
        await focusEditor(page);
        // insert new card
        await page.keyboard.type('/html');
        await page.waitForSelector('[data-kg-card-menu-item="HTML"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-kg-card="html"][data-kg-card-editing="true"]')).toBeVisible();
        // waiting for html editor
        await expect(page.locator('.cm-content[contenteditable="true"]')).toBeVisible();

        // Types slower. Codemirror can be slow and needs some time to place the cursor after entering text.
        await page.keyboard.type('Here are some words', {delay: 500});
        await expect(page.getByText('Here are some words')).toBeVisible();
        await page.keyboard.press('Backspace');
        await expect(page.getByText('Here are some word')).toBeVisible();
        await page.keyboard.press(`${ctrlOrCmd()}+z`);
        await expect(page.getByText('Here are some words')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByText('Here are some words')).toBeVisible();
    });

    test('goes into display mode when losing focus', async function () {
        await focusEditor(page);
        // insert new card
        await page.keyboard.type('/html');
        await page.waitForSelector('[data-kg-card-menu-item="HTML"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-kg-card="html"][data-kg-card-editing="true"]')).toBeVisible();
        // waiting for html editor
        await expect(page.locator('.cm-content[contenteditable="true"]')).toBeVisible();

        // Types slower. Codemirror can be slow and needs some time to place the cursor after entering text.
        await page.keyboard.type('Here are some words');
        await page.getByTestId('post-title').click();
        await page.keyboard.type('post title'); // click outside of the editor

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div><svg></svg></div>
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="html">
                    <div>
                        <div class="min-h-[3.5vh] whitespace-normal">
                            Here are some words
                        </div>
                        <div class="absolute inset-0 z-50 mt-0">
                        </div>
                    </div>
                </div>
            </div>
            <p><br /></p>
        `);
    });
});
