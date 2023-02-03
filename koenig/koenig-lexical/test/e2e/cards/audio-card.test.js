import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {expect} from '@playwright/test';
import {startApp, initialize, focusEditor, assertHTML, html} from '../../utils/e2e';
import path from 'path';

describe('Audio card', async () => {
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

    test('can import serialized audio card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'audio',
                        src: '/content/images/2022/11/koenig-lexical.jpg',
                        title: 'This is a title',
                        duration: '',
                        mimeType: 'audio/mp3',
                        thumbnailSrc: '/content/images/2022/12/koenig-lexical.png'
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
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="audio">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('renders audio card node', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');

        await focusEditor(page);
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.keyboard.type('/audio');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="audio"></div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});

        // Close the fileChooser by selecting a file
        // Without this line, fileChooser stays open for subsequent tests
        await fileChooser.setFiles([filePath]);
    });

    test('can upload an audio file', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');

        await focusEditor(page);

        // Upload audio file
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.keyboard.type('/audio');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        // Check that the progress bar is displayed
        await page.waitForSelector('[data-testid="progress-bar"]');
        expect(await page.getByTestId('progress-bar')).toBeVisible();

        // Check that audio file was uploaded
        await page.waitForSelector('input[name="title"]');
        expect(await page.locator('input[name="title"]').inputValue()).toEqual('Audio sample');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="audio">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true}); // TODO: assert on HTML of inner card (not working due to error in prettier)
    });

    test('shows errors on failed audio upload', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample-fail.mp3');

        await focusEditor(page);

        // Upload audio file
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.keyboard.type('/audio');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        // Check that the progress bar is displayed
        await page.waitForSelector('[data-testid="progress-bar"]');
        expect(await page.getByTestId('progress-bar')).toBeVisible();

        // Check that errors are displayed
        await page.waitForSelector('[data-testid="audio-upload-errors"]');
        expect(await page.getByTestId('audio-upload-errors')).toBeVisible();
    });

    test('file input opens immediately when added via card menu', async function () {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('[data-kg-card-menu-item="Audio"]')
        ]);

        expect(fileChooser).not.toBeNull();
    });

    test('file input opens immediately when added via slash menu', async function () {
        await focusEditor(page);
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.keyboard.type('/audio'),
            await page.keyboard.press('Enter')
        ]);

        expect(fileChooser).not.toBeNull();
    });

    test('can change the title of the audio card', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');

        await focusEditor(page);

        // Upload audio
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.keyboard.type('/audio');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        // Change title
        await page.waitForSelector('input[name="title"]');
        await page.locator('input[name="title"]').click();
        await page.keyboard.type(' 1');
        
        // Check that title updated
        expect(await page.locator('input[name="title"]').inputValue()).toEqual('Audio sample 1');
    });

    test('can upload and remove a thumbnail image', async function () {
        const audioFilePath = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');
        const thumbnailFilePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.jpeg');

        await focusEditor(page);

        // Upload audio file
        const audioFileChooserPromise = page.waitForEvent('filechooser');
        await page.keyboard.type('/audio');
        await page.keyboard.press('Enter');
        const audioFileChooser = await audioFileChooserPromise;
        await audioFileChooser.setFiles([audioFilePath]);

        // Upload thumbnail
        const thumbnailFileChooserPromise = page.waitForEvent('filechooser');
        await page.getByTestId('upload-thumbnail').click();
        const thumbnailFileChooser = await thumbnailFileChooserPromise;
        await thumbnailFileChooser.setFiles([thumbnailFilePath]);

        expect (await page.getByTestId('audio-thumbnail')).not.toBeNull();

        // Remove thumbnail
        await page.getByTestId('remove-thumbnail').click();
        expect (await page.getByTestId('upload-thumbnail')).not.toBeNull();
    });

    test('shows errors on a failed thumbnail upload', async function () {
        const audioFilePath = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');
        const thumbnailFilePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image-fail.jpeg');

        await focusEditor(page);

        // Upload audio file
        const audioFileChooserPromise = page.waitForEvent('filechooser');
        await page.keyboard.type('/audio');
        await page.keyboard.press('Enter');
        const audioFileChooser = await audioFileChooserPromise;
        await audioFileChooser.setFiles([audioFilePath]);

        // Upload thumbnail
        const thumbnailFileChooserPromise = page.waitForEvent('filechooser');
        await page.getByTestId('upload-thumbnail').click();
        const thumbnailFileChooser = await thumbnailFileChooserPromise;
        await thumbnailFileChooser.setFiles([thumbnailFilePath]);

        await page.waitForSelector('[data-testid="thumbnail-errors"]');
        expect (await page.getByTestId('thumbnail-errors').textContent()).toEqual('Upload failed');
    });
});
