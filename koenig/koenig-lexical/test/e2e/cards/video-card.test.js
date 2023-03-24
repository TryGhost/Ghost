import createDataTransfer from '../../utils/createDataTransfer';
import path from 'path';
import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, focusEditor, html, initialize, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

describe('Video card', async () => {
    let app;
    let page;

    beforeAll(async () => {
        // Video card is tested in firefox
        // Need to get video thumbnail before uploading on the server; for this purpose, convert video to blob https://github.com/TryGhost/Koenig/blob/a04c59c2d81ddc783869c47653aa9d7adf093629/packages/koenig-lexical/src/utils/extractVideoMetadata.js#L45
        // The problem is that Chromium can't read video src as blob
        ({app, page} = await startApp('firefox'));
    });

    afterAll(async () => {
        await app.stop();
    });

    beforeEach(async () => {
        await initialize({page});
    });

    test('can import serialized video card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'video',
                        src: '/content/images/2022/11/koenig-lexical.jpg',
                        width: 100,
                        height: 100,
                        title: 'This is a title',
                        duration: 60,
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
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="video">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('renders video card node', async function () {
        const fileChooserPromise = page.waitForEvent('filechooser');
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');

        await focusEditor(page);
        await page.keyboard.type('/video');
        await page.waitForSelector('[data-kg-card-menu-item="Video"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="video"></div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});

        // Close the fileChooser by selecting a file
        // Without this line, fileChooser stays open for subsequent tests
        await fileChooser.setFiles([filePath]);
    });

    test('can upload video file from slash menu', async function () {
        const fileChooserPromise = page.waitForEvent('filechooser');
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');

        await focusEditor(page);

        // Upload video file
        await page.keyboard.type('/video');
        await page.waitForSelector('[data-kg-card-menu-item="Video"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        // Check that video file was uploaded
        await expect(await page.getByTestId('media-duration')).toContainText('0:04');
    });

    test('can upload video file from card menu', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        // Check that video file was uploaded
        await expect(await page.getByTestId('media-duration')).toContainText('0:04');
    });

    test('can show errors for failed video upload', async function () {
        await focusEditor(page);
        await uploadVideo(page, 'video-fail.mp4');

        // Errors should be visible
        await expect(await page.getByTestId('media-placeholder-errors')).toBeVisible();
    });

    test('can manage custom thumbnail', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        // Settings panel should be visible
        await expect(await page.getByTestId('settings-panel')).toBeVisible();

        // Custom thumbnail should be visible
        const emptyThumbnail = await page.getByTestId('thumbnail-media-placeholder');
        await expect(emptyThumbnail).toBeVisible();

        // Upload thumbnail
        const imagePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const fileChooserPromise = page.waitForEvent('filechooser');
        emptyThumbnail.click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([imagePath]);

        // Thumbnail should be visible
        await expect(await page.getByTestId('custom-thumbnail-filled')).toBeVisible();

        // Can remove thumbnail
        const replaceButton = page.getByTestId('custom-thumbnail-replace');
        replaceButton.click();
        await expect(await page.getByTestId('thumbnail-media-placeholder')).toBeVisible();
    });

    test('can show errors for custom thumbnail', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        // Settings panel should be visible
        await expect(await page.getByTestId('settings-panel')).toBeVisible();

        // Errors shouldn't be visible
        await expect(page.getByTestId('media-placeholder-errors')).toBeHidden();

        // Custom thumbnail should be visible
        const emptyThumbnail = await page.getByTestId('thumbnail-media-placeholder');

        // Upload thumbnail
        const imagePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image-fail.jpeg');
        const fileChooserPromise = page.waitForEvent('filechooser');
        emptyThumbnail.click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([imagePath]);

        // Errors should be visible
        await expect(await page.getByTestId('custom-thumbnails-errors')).toBeVisible();
    });

    test('can hide custom thumbnail if loop enabled', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        // Loop toggle should be visible and unchecked
        const loopButton = await page.getByTestId('loop-video');
        await expect(loopButton).toBeVisible();
        await expect(await page.locator('[data-testid="loop-video"] input').isChecked()).toBeFalsy();

        // Custom thumbnail should be visible
        const emptyThumbnail = await page.getByTestId('thumbnail-media-placeholder');
        await expect(emptyThumbnail).toBeVisible();

        // Custom thumbnail should be hidden after loop enabled
        await loopButton.check();
        await expect(page.getByTestId('thumbnail-media-placeholder')).toBeHidden();
    });

    test('can upload dropped video', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');
        const fileChooserPromise = page.waitForEvent('filechooser');

        await focusEditor(page);

        // Open video card and dismiss files chooser to prepare card for video dropping
        await page.keyboard.type('/video');
        await page.waitForSelector('[data-kg-card-menu-item="Video"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([]);

        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'video.mp4', fileType: 'video/mp4'}]);
        await page.getByTestId('media-placeholder').dispatchEvent('dragover', {dataTransfer});

        // Dragover text should be visible
        await expect(await page.locator('[data-kg-card-drag-text="true"]')).toBeVisible();

        // Drop file
        await page.getByTestId('media-placeholder').dispatchEvent('drop', {dataTransfer});

        // Check that video file was uploaded
        await expect(await page.getByTestId('media-duration')).toContainText('0:04');
    });

    test('can show errors if was dropped a file with wrong extension to video placeholder', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const fileChooserPromise = page.waitForEvent('filechooser');

        await focusEditor(page);

        // Open video card and dismiss files chooser to prepare card for video dropping
        await page.keyboard.type('/video');
        await page.waitForSelector('[data-kg-card-menu-item="Video"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([]);

        //  Drop file
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'large-image.png', fileType: 'image/png'}]);
        await page.getByTestId('media-placeholder').dispatchEvent('dragover', {dataTransfer});
        await page.getByTestId('media-placeholder').dispatchEvent('drop', {dataTransfer});

        // Errors should be visible
        await expect(await page.getByTestId('media-placeholder-errors')).toBeVisible();
    });

    test('can upload dropped custom thumbnail', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await uploadVideo(page);

        // Wait for custom thumbnail
        await page.waitForSelector('[data-testid="thumbnail-media-placeholder"]');

        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'large-image.png', fileType: 'image/png'}]);
        await page.getByTestId('thumbnail-media-placeholder').dispatchEvent('dragover', {dataTransfer});

        // Dragover text should be visible
        await expect(await page.locator('[data-kg-card-drag-text="true"]')).toBeVisible();

        // Drop file
        await page.getByTestId('thumbnail-media-placeholder').dispatchEvent('drop', {dataTransfer});

        // Thumbnail should be visible
        await expect(await page.getByTestId('custom-thumbnail-filled')).toBeVisible();
    });

    test('can show errors if was dropped a file with wrong extension to custom thumbnail', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');

        await focusEditor(page);
        await uploadVideo(page);

        // Wait for custom thumbnail
        await page.waitForSelector('[data-testid="thumbnail-media-placeholder"]');

        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'video.mp4', fileType: 'video/mp4'}]);
        await page.getByTestId('thumbnail-media-placeholder').dispatchEvent('drop', {dataTransfer});

        // Errors should be visible
        await expect(await page.getByTestId('custom-thumbnails-errors')).toBeVisible();
    });

    test('renders video card toolbar', async function () {
        await focusEditor(page);

        // Upload video
        await uploadVideo(page);
        await page.waitForSelector('[data-testid="thumbnail-media-placeholder"]');

        // Leave editing mode to display the toolbar
        await page.keyboard.press('Escape');

        // Check that the toolbar is displayed
        await expect(await page.locator('[data-kg-card-toolbar="video"]')).toBeVisible();
    });

    test('video card toolbar has Edit button', async function () {
        await focusEditor(page);

        // Upload video
        await uploadVideo(page);
        await page.waitForSelector('[data-testid="thumbnail-media-placeholder"]');

        // Leave editing mode to display the toolbar
        await page.keyboard.press('Escape');

        // Check that the toolbar is displayed
        await expect(await page.locator('[data-kg-card-toolbar="video"]')).toBeVisible();

        // Edit video card
        await page.waitForSelector('[data-testid="edit-video-card"]');
        await page.getByTestId('edit-video-card').click();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="video"></div>
                <figcaption>
                    <div data-testid="image-caption-editor">
                        <div>
                            <div data-kg="editor">
                                <div spellcheck="true" data-lexical-editor="true" data-koenig-dnd-container="true" role="textbox" contenteditable="true">
                                    <p><br /></p>
                                </div>
                            </div>
                            <div>Type caption for video (optional)</div>
                            <div id="koenig-drag-drop-ghost-container"></div>
                        </div>
                    </div>
                </figcaption>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('adds extra paragraph when video is inserted at end of document', async function () {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');

        await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('[data-kg-card-menu-item="Video"]')
        ]);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="video">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('does not add extra paragraph when video is inserted mid-document', async function () {
        await focusEditor(page);
        await page.keyboard.press('Enter');
        await page.keyboard.type('Testing');
        await page.keyboard.press('ArrowUp');
        await page.click('[data-kg-plus-button]');

        await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('[data-kg-card-menu-item="Video"]')
        ]);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="video">
                </div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
        `, {ignoreCardContents: true});
    });
});

async function uploadVideo(page, fileName = 'video.mp4') {
    const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/${fileName}`);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.keyboard.type('/video');
    await page.waitForSelector('[data-kg-card-menu-item="Video"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([filePath]);
}
