import createDataTransfer from '../../utils/createDataTransfer';
import path from 'path';
import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, focusEditor, html, initialize, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

// Video card is tested in firefox
// Need to get video thumbnail before uploading on the server; for this purpose, convert video to blob https://github.com/TryGhost/Koenig/blob/a04c59c2d81ddc783869c47653aa9d7adf093629/packages/koenig-lexical/src/utils/extractVideoMetadata.js#L45
// The problem is that Chromium can't read video src as blob
describe('Drag Drop Paste Plugin Firefox', async function () {
    let app;
    let page;

    beforeAll(async function () {
        ({app, page} = await startApp('firefox'));
    });

    afterAll(async function () {
        await app.stop();
    });

    beforeEach(async function () {
        await initialize({page});
    });

    test('can drag and drop a video file on the editor', async function () {
        await focusEditor(page);

        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'video.mp4', fileType: 'video/mp4'}]);

        await page.locator('.kg-prose').dispatchEvent('dragenter', {dataTransfer});
        await page.locator('.kg-prose').dispatchEvent('drop', {dataTransfer});

        // Check that video file was uploaded
        await expect(await page.getByTestId('media-duration')).toContainText('0:04');
    });

    test('can drag and drop multiple video files on the editor', async function () {
        await focusEditor(page);
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');
        const filePath2 = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');
        const dataTransfer = await createDataTransfer(page, [
            {filePath, fileName: 'video-1.mp4', fileType: 'video/mp4'},
            {filePath: filePath2, fileName: 'video-2.mp4', fileType: 'video/mp4'}
        ]);

        await page.locator('.kg-prose').dispatchEvent('dragenter', {dataTransfer});
        await page.locator('.kg-prose').dispatchEvent('drop', {dataTransfer});

        // wait for card visibility
        await expect(await page.getByTestId('media-duration')).toHaveCount(2);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="video">
                </div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="video">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true, ignoreInnerSVG: false});
    });

    test('can drag and drop multiple different types of files on the editor', async function () {
        await focusEditor(page);
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const filePath2 = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');
        const filePath3 = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');
        const dataTransfer = await createDataTransfer(page, [
            {filePath, fileName: 'large-image.png', fileType: 'image/png'},
            {filePath: filePath2, fileName: 'audio-sample.mp3', fileType: 'audio/mp3'},
            {filePath: filePath3, fileName: 'video.mp4', fileType: 'video/mp4'}
        ]);

        await page.locator('.kg-prose').dispatchEvent('dragenter', {dataTransfer});
        await page.locator('.kg-prose').dispatchEvent('drop', {dataTransfer});

        // Wait for uploads to complete
        await expect(await page.locator('input[value="Audio sample"]')).toBeVisible();
        await expect(await page.getByTestId('image-card-populated')).toBeVisible();
        await expect(await page.locator('[data-testid="video-card-populated"] [data-testid="media-duration"]')).toContainText('0:04');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="image">
                </div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="audio">
                </div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="video">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true, ignoreInnerSVG: false});
    });
});
