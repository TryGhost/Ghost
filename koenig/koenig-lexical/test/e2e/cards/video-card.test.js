import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {expect} from '@playwright/test';
import {startApp, initialize, focusEditor, assertHTML, html} from '../../utils/e2e';
import path from 'path';

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
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="video">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('renders video card node', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');

        await focusEditor(page);
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.keyboard.type('/video');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="video"></div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});

        // Close the fileChooser by selecting a file
        // Without this line, fileChooser stays open for subsequent tests
        await fileChooser.setFiles([filePath]);
    });

    test('can upload video file from slash menu', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');

        await focusEditor(page);

        // Upload video file
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.keyboard.type('/video');
        await page.keyboard.press('Enter');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        // Check progress bar
        await page.waitForSelector('[data-testid="video-progress"]');
        expect(await page.getByTestId('video-progress')).toBeVisible();

        // Check that video file was uploaded
        await page.waitForSelector('[data-testid="video-duration"]');
        await expect(page.getByTestId('video-duration')).toContainText('0:04');
    });

    test('can upload video file from card menu', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        // Check progress bar
        await page.waitForSelector('[data-testid="video-progress"]');
        expect(await page.getByTestId('video-progress')).toBeVisible();

        // Check that video file was uploaded
        await page.waitForSelector('[data-testid="video-duration"]');
        await expect(page.getByTestId('video-duration')).toContainText('0:04');
    });

    test('can manage custom thumbnail', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        // Settings panel should be visible
        await page.waitForSelector('[data-testid="video-settings-panel"]');
        await expect(page.getByTestId('video-settings-panel')).toBeVisible();

        // Custom thumbnail should be visible
        await page.waitForSelector('[data-testid="custom-thumbnail-empty"]');
        const emptyThumbnail = page.getByTestId('custom-thumbnail-empty');
        await expect(emptyThumbnail).toBeVisible();

        // Upload thumbnail
        const imagePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const fileChooserPromise = page.waitForEvent('filechooser');
        emptyThumbnail.click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([imagePath]);

        // Progress bar should be visible
        await page.waitForSelector('[data-testid="custom-thumbnail-progress"]');
        await expect(page.getByTestId('custom-thumbnail-progress')).toBeVisible();

        // Thumbnail should be visible
        await page.waitForSelector('[data-testid="custom-thumbnail-filled"]');
        await expect(page.getByTestId('custom-thumbnail-filled')).toBeVisible();

        // Can remove thumbnail
        const replaceButton = page.getByTestId('custom-thumbnail-replace');
        replaceButton.click();
        await page.waitForSelector('[data-testid="custom-thumbnail-empty"]');
        await expect(page.getByTestId('custom-thumbnail-empty')).toBeVisible();
    });

    test('can hide custom thumbnail if loop enabled', async function () {
        await focusEditor(page);
        await uploadVideo(page);

        // Loop toggle should be visible and unchecked
        await page.waitForSelector('[data-testid="loop-video"]');
        const loopButton = page.getByTestId('loop-video');
        await expect(loopButton).toBeVisible();
        await expect(await page.locator('[data-testid="loop-video"] input').isChecked()).toBeFalsy();

        // Custom thumbnail should be visible
        await page.waitForSelector('[data-testid="custom-thumbnail-empty"]');
        const emptyThumbnail = page.getByTestId('custom-thumbnail-empty');
        await expect(emptyThumbnail).toBeVisible();

        // Custom thumbnail should be hidden after loop enabled
        await loopButton.check();
        await expect(page.getByTestId('custom-thumbnail-empty')).toBeHidden();
    });
});

async function uploadVideo(page) {
    const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.keyboard.type('/video');
    await page.keyboard.press('Enter');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([filePath]);
}
