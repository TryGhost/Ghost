import createDataTransfer from '../../utils/createDataTransfer';
import path from 'path';
import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, focusEditor, html, initialize, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

describe('File card', async () => {
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
    
    test('can import serialized file card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'file',
                        src: '/content/images/2022/11/koenig-lexical.jpg',
                        title: 'This is a title',
                        description: 'This is a description',
                        fileName: 'koenig-lexical.jpg',
                        fileSize: '1.2 MB'
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

        // page.pause();
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="file">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('renders file card node', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/print-img.pdf');

        await focusEditor(page);
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.keyboard.type('/file');
        await page.waitForSelector('[data-kg-card-menu-item="File"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="file"></div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});

        // Close the fileChooser by selecting a file
        // Without this line, fileChooser stays open for subsequent tests
        await fileChooser.setFiles([filePath]);
    });

    test('can upload a file', async function () {
        await focusEditor(page);
        await uploadFile(page);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="file">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true}); // TODO: assert on HTML of inner card (not working due to error in prettier)
    });

    test('can upload dropped file', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/print-img.pdf');
        const fileChooserPromise = page.waitForEvent('filechooser');

        await focusEditor(page);

        // Open file card and dismiss files chooser to prepare card for file dropping
        await page.keyboard.type('/file');
        await page.waitForSelector('[data-kg-card-menu-item="File"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([]);

        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'print-img.pdf', fileType: 'application/pdf'}]);
        await page.getByTestId('media-placeholder').dispatchEvent('dragover', {dataTransfer});

        // Dragover text should be visible
        await expect(await page.locator('[data-kg-card-drag-text="true"]')).toBeVisible();

        // Drop file
        await page.getByTestId('media-placeholder').dispatchEvent('drop', {dataTransfer});

        // Dragover text should not be visible
        // expect data-kg-file-card="dataset
        await expect(await page.locator('[data-kg-file-card="dataset"]')).toBeVisible();
    });

    test('file input opens immediately when added via card menu', async function () {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('[data-kg-card-menu-item="File"]')
        ]);

        expect(fileChooser).not.toBeNull();
    });

    test('file input opens immediately when added via slash menu', async function () {
        await focusEditor(page);
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.keyboard.type('/file'),
            await page.waitForSelector('[data-kg-card-menu-item="File"][data-kg-cardmenu-selected="true"]'),
            await page.keyboard.press('Enter')
        ]);

        expect(fileChooser).not.toBeNull();
    });

    it('can edit file card title', async function () {
        await focusEditor(page);
        await uploadFile(page);
        await page.locator('[data-kg-file-card="fileTitle"]').fill('Free printable pdf');
        await expect(await page.locator('[data-kg-file-card="fileTitle"]')).toHaveValue('Free printable pdf');
    });

    it('can edit file card description', async function () {
        await focusEditor(page);
        await uploadFile(page);
        await page.locator('[data-kg-file-card="fileDescription"]').fill('Enjoy this free download of a puppy pdf');
        await expect(await page.locator('[data-kg-file-card="fileDescription"]')).toHaveValue('Enjoy this free download of a puppy pdf');
    });
});

async function uploadFile(page, fileName = 'print-img.pdf') {
    const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/${fileName}`);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.keyboard.type('/file');
    await page.waitForSelector('[data-kg-card-menu-item="File"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([filePath]);
}
