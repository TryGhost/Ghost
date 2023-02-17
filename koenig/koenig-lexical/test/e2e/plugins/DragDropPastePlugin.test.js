import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {expect} from '@playwright/test';
import {startApp, initialize, focusEditor, assertHTML, html} from '../../utils/e2e';
import path from 'path';
import createDataTransfer from '../../utils/createDataTransfer';

describe('Drag Drop Paste Plugin', async function () {
    let app;
    let page;

    beforeAll(async function () {
        ({app, page} = await startApp());
    });

    afterAll(async function () {
        await app.stop();
    });

    beforeEach(async function () {
        await initialize({page});
    });

    test('can drag and drop an image on the editor', async function () {
        await focusEditor(page);

        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'large-image.png', fileType: 'image/png'}]);

        await page.locator('.kg-prose').dispatchEvent('dragenter', {dataTransfer});
        await page.locator('.kg-prose').dispatchEvent('drop', {dataTransfer});

        // wait for upload to complete
        await expect(await page.getByTestId('progress-bar')).toBeVisible();
        await expect(await page.getByTestId('progress-bar')).toBeHidden();

        // wait for card visibility
        await expect(await page.getByTestId('image-card-populated')).toBeVisible();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img src="blob:..." alt="" />
                        </div>

                        <figcaption>
                            <input placeholder="Type caption for image (optional)" value="" />
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardToolbarContents: true, ignoreCardContents: true});
    });

    test('can drag and drop multiple images on the editor', async function () {
        await focusEditor(page);
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const filePath2 = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.jpeg');
        const dataTransfer = await createDataTransfer(page, [
            {filePath, fileName: 'large-image.png', fileType: 'image/png'},
            {filePath: filePath2, fileName: 'large-image.jpeg', fileType: 'image/jpeg'}
        ]);

        await page.locator('.kg-prose').dispatchEvent('dragenter', {dataTransfer});
        await page.locator('.kg-prose').dispatchEvent('drop', {dataTransfer});

        // wait for upload to complete
        await expect(await page.getByTestId('progress-bar')).toHaveCount(2);
        await expect(await page.getByTestId('progress-bar')).toHaveCount(0);

        // wait for card visibility
        await expect(await page.getByTestId('image-card-populated')).toHaveCount(2);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img
                                src="blob:..."
                                alt="" />
                        </div>
                    </figure>
                </div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img
                                src="blob:..."
                                alt="" />
                        </div>
                        <figcaption>
                            <input placeholder="Type caption for image (optional)" value="" />
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardToolbarContents: true, ignoreCardContents: true});
    });

    test('can drag and drop an audio file on the editor', async function () {
        await focusEditor(page);

        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'audio-sample.mp3', fileType: 'audio/mp3'}]);

        await page.locator('.kg-prose').dispatchEvent('dragenter', {dataTransfer});
        await page.locator('.kg-prose').dispatchEvent('drop', {dataTransfer});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="audio">

                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can drag and drop multiple audio files on the editor', async function () {
        await focusEditor(page);
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');
        const filePath2 = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');

        const dataTransfer = await createDataTransfer(page, [
            {filePath, fileName: 'audio-sample-1.mp3', fileType: 'audio/mp3'},
            {filePath: filePath2, fileName: 'audio-sample-2.mp3', fileType: 'audio/mp3'}
        ]);

        await page.locator('.kg-prose').dispatchEvent('dragenter', {dataTransfer});
        await page.locator('.kg-prose').dispatchEvent('drop', {dataTransfer});

        await expect(await page.locator('input[value="Audio sample 1"]')).toBeVisible();
        await expect(await page.locator('input[value="Audio sample 2"]')).toBeVisible();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="audio">
                </div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="audio">

                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true, ignoreInnerSVG: false});
    });
});
