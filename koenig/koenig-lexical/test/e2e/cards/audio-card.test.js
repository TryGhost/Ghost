import createDataTransfer from '../../utils/createDataTransfer';
import path from 'path';
import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, focusEditor, html, initialize, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

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
        await page.waitForSelector('[data-kg-card-menu-item="Audio"][data-kg-cardmenu-selected="true"]');
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
        await focusEditor(page);
        await uploadAudio(page);

        // Check that audio file was uploaded
        await expect(await page.getByTestId('audio-caption')).toBeVisible();
        expect(await page.getByTestId('audio-caption').inputValue()).toEqual('Audio sample');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="audio">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true}); // TODO: assert on HTML of inner card (not working due to error in prettier)
    });

    test('can upload dropped audio', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');
        const fileChooserPromise = page.waitForEvent('filechooser');

        await focusEditor(page);

        // Open audio card and dismiss files chooser to prepare card for audio dropping
        await page.keyboard.type('/audio');
        await page.waitForSelector('[data-kg-card-menu-item="Audio"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([]);

        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'audio-sample.mp3', fileType: 'audio/mp3'}]);
        await page.getByTestId('media-placeholder').dispatchEvent('dragover', {dataTransfer});

        // Dragover text should be visible
        await expect(await page.locator('[data-kg-card-drag-text="true"]')).toBeVisible();

        // Drop file
        await page.getByTestId('media-placeholder').dispatchEvent('drop', {dataTransfer});

        // Check that audio file was uploaded
        await expect(await page.getByTestId('media-duration')).toContainText('0:19');
    });

    test('shows errors on failed audio upload', async function () {
        await focusEditor(page);
        await uploadAudio(page, 'audio-sample-fail.mp3');

        // Check that errors are displayed
        await page.waitForSelector('[data-testid="audio-upload-errors"]');
        expect(await page.getByTestId('audio-upload-errors')).toBeVisible();
    });

    test('can show errors if was dropped a file with wrong extension to audio placeholder', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const fileChooserPromise = page.waitForEvent('filechooser');

        await focusEditor(page);

        // Open audio card and dismiss files chooser to prepare card for audio dropping
        await page.keyboard.type('/audio');
        await page.waitForSelector('[data-kg-card-menu-item="Audio"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([]);

        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'large-image.png', fileType: 'image/png'}]);
        await page.getByTestId('media-placeholder').dispatchEvent('drop', {dataTransfer});

        // Errors should be visible
        await expect(await page.getByTestId('audio-upload-errors')).toBeVisible();
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
            await page.waitForSelector('[data-kg-card-menu-item="Audio"][data-kg-cardmenu-selected="true"]'),
            await page.keyboard.press('Enter')
        ]);

        expect(fileChooser).not.toBeNull();
    });

    test('can change the title of the audio card', async function () {
        await focusEditor(page);
        await uploadAudio(page);

        // Change title
        await expect(await page.getByTestId('audio-caption')).toBeVisible();
        await page.getByTestId('audio-caption').click();
        await page.keyboard.type(' 1');

        // Check that title updated
        expect(await page.getByTestId('audio-caption').inputValue()).toEqual('Audio sample 1');
    });

    test('can upload and remove a thumbnail image', async function () {
        const thumbnailFilePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.jpeg');

        await focusEditor(page);
        await uploadAudio(page);

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

    test('can upload dropped thumbnail', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        await focusEditor(page);
        await uploadAudio(page);

        // Check that audio file was uploaded
        await expect(await page.getByTestId('media-duration')).toContainText('0:19');

        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'large-image.png', fileType: 'image/png'}]);
        await page.getByTestId('audio-card-populated').dispatchEvent('dragover', {dataTransfer});

        // Dragover text should be visible
        await expect(await page.getByTestId('audio-thumbnail-dragover')).toBeVisible();

        // Drop file
        await page.getByTestId('audio-card-populated').dispatchEvent('drop', {dataTransfer});

        // Check that audio file was uploaded
        await expect (await page.getByTestId('audio-thumbnail')).toBeVisible();
    });

    test('can show errors if was dropped a file with wrong extension to thumbnail', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');
        await focusEditor(page);
        await uploadAudio(page);

        // Check that audio file was uploaded
        await expect(await page.getByTestId('media-duration')).toContainText('0:19');

        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'video.mp4', fileType: 'video/mp4'}]);
        await page.getByTestId('audio-card-populated').dispatchEvent('drop', {dataTransfer});

        // Errors should be visible
        await expect(await page.getByTestId('thumbnail-errors')).toBeVisible();
    });

    test('shows errors on a failed thumbnail upload', async function () {
        const thumbnailFilePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image-fail.jpeg');

        await focusEditor(page);
        await uploadAudio(page);

        // Upload thumbnail
        const thumbnailFileChooserPromise = page.waitForEvent('filechooser');
        await page.getByTestId('upload-thumbnail').click();
        const thumbnailFileChooser = await thumbnailFileChooserPromise;
        await thumbnailFileChooser.setFiles([thumbnailFilePath]);

        await page.waitForSelector('[data-testid="thumbnail-errors"]');
        expect (await page.getByTestId('thumbnail-errors').textContent()).toEqual('Upload failed');
    });

    test('renders audio card toolbar', async function () {
        await focusEditor(page);
        await uploadAudio(page);

        // Leave editing mode to display the toolbar
        await expect(await page.getByTestId('audio-caption')).toBeVisible();
        await page.keyboard.press('Escape');

        // Check that the toolbar is displayed
        expect(await page.locator('[data-kg-card-toolbar="audio"]')).not.toBeNull();
    });

    test('audio card toolbar has Edit button', async function () {
        await focusEditor(page);
        await uploadAudio(page);

        // Leave editing mode to display the toolbar
        await expect(await page.getByTestId('audio-caption')).toBeVisible();
        await page.keyboard.press('Escape');

        // Check that the toolbar is displayed
        expect(await page.locator('[data-kg-card-toolbar="audio"]')).not.toBeNull();

        await page.waitForSelector('[data-kg-card-toolbar="audio"] button[aria-label="Edit"]');
        await page.locator('[data-kg-card-toolbar="audio"] button[aria-label="Edit"]').click();

        await assertHTML(page, html`
        <div data-lexical-decorator="true" contenteditable="false">
            <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="audio">
            </div>
        </div>
        <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('should not be available for editing in preview mode', async function () {
        await focusEditor(page);
        await uploadAudio(page);

        // Check that audio file was uploaded
        await expect(await page.getByTestId('media-duration')).toContainText('0:19');
        await page.keyboard.press('Escape');

        // Caption input should be read only
        await expect(await page.getByTestId('audio-caption')).toHaveAttribute('readOnly', '');

        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'large-image.png', fileType: 'image/png'}]);
        await page.getByTestId('audio-card-populated').dispatchEvent('dragover', {dataTransfer});

        // Dragover text shouldn't be visible
        await expect(await page.getByTestId('audio-thumbnail-dragover')).toBeHidden();
    });

    test('does not add extra paragraph when audio is inserted mid-document', async function () {
        await focusEditor(page);
        await page.keyboard.press('Enter');
        await page.keyboard.type('Testing');
        await page.keyboard.press('ArrowUp');
        await page.click('[data-kg-plus-button]');

        await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('[data-kg-card-menu-item="Audio"]')
        ]);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="audio">
                </div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
        `, {ignoreCardContents: true});
    });

    test('adds extra paragraph when audio is inserted at end of document', async function () {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');

        await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('[data-kg-card-menu-item="Audio"]')
        ]);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="audio">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });
});

async function uploadAudio(page, fileName = 'audio-sample.mp3') {
    const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/${fileName}`);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.keyboard.type('/audio');
    await page.waitForSelector('[data-kg-card-menu-item="Audio"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([filePath]);
}
