import createDataTransfer from '../../utils/createDataTransfer';
import path from 'path';
import {afterAll, beforeAll, beforeEach, describe, it} from 'vitest';
import {assertHTML, focusEditor, html, initialize, insertCard, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

describe('Gallery card', async () => {
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

    it('can import serialized gallery card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'gallery',
                        version: 1,
                        images: [{
                            row: 0,
                            fileName: 'retreat-1.jpg',
                            src: '/content/images/2023/04/retreat-1.jpg',
                            width: 3840,
                            height: 2160,
                            title: 'Title 1',
                            alt: 'Alt 1',
                            caption: 'This is the <b>first caption</b>'
                        }, {
                            row: 0,
                            fileName: 'retreat-2.jpg',
                            src: '/content/images/2023/04/retreat-2.jpg',
                            width: 3840,
                            height: 2160,
                            title: 'Title 2',
                            alt: 'Alt 2',
                            caption: 'This is another caption'
                        }]
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
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="gallery">
                    <figure>
                        <div>
                            <div data-gallery="true">
                                <div data-row="0">
                                    <div data-image="true">
                                        <img
                                            alt="Alt 1"
                                            height="2160"
                                            src="/content/images/2023/04/retreat-1.jpg"
                                            width="3840" />
                                        <div>
                                            <div>
                                                <button type="button"><svg></svg></button>
                                            </div>
                                        </div>
                                    </div>
                                    <div data-image="true">
                                        <img
                                            alt="Alt 2"
                                            height="2160"
                                            src="/content/images/2023/04/retreat-2.jpg"
                                            width="3840" />
                                        <div>
                                            <div>
                                                <button type="button"><svg></svg></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <form>
                                <input
                                    accept="image/gif,image/jpg,image/jpeg,image/png,image/svg+xml,image/webp"
                                    hidden=""
                                    multiple=""
                                    name="image-input"
                                    type="file" />
                            </form>
                        </div>
                    </figure>
                </div>
            </div>
        `);
    });

    it('can insert gallery card', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'gallery'});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="gallery">
                    <figure>
                        <div>
                            <div>
                                <div>
                                    <button name="placeholder-button" type="button">
                                        <svg></svg>
                                        <p>Click to select up to 9 images</p>
                                    </button>
                                </div>
                            </div>
                            <form>
                                <input
                                    accept="image/gif,image/jpg,image/jpeg,image/png,image/svg+xml,image/webp"
                                    hidden=""
                                    multiple=""
                                    name="image-input"
                                    type="file" />
                            </form>
                        </div>
                        <figcaption>
                            <div>
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="true" spellcheck="true" data-lexical-editor="true" role="textbox">
                                            <p><br /></p>
                                        </div>
                                    </div>
                                    <div>Type caption for gallery (optional)</div>
                                </div>
                            </div>
                        </figcaption>
                    </figure>
                </div>
            </div>
            <p><br /></p>
        `);
    });

    it('can upload images', async function () {
        const fileChooserPromise = page.waitForEvent('filechooser');
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.jpeg');

        await focusEditor(page);
        await insertCard(page, {cardName: 'gallery'});
        await page.click('[name="placeholder-button"]');

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        await page.waitForSelector('[data-gallery="true"]');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="gallery">
                    <figure>
                        <div>
                            <div data-gallery="true">
                                <div data-row="0">
                                    <div data-image="true">
                                        <img
                                            height="248"
                                            src="blob:..."
                                            width="248" />
                                        <div>
                                            <div>
                                                <button type="button"><svg></svg></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <form>
                                <input
                                    accept="image/gif,image/jpg,image/jpeg,image/png,image/svg+xml,image/webp"
                                    hidden=""
                                    multiple=""
                                    name="image-input"
                                    type="file" />
                            </form>
                        </div>
                        <figcaption>
                            <div>
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="true" spellcheck="true" data-lexical-editor="true" role="textbox">
                                            <p><br /></p>
                                        </div>
                                    </div>
                                    <div>Type caption for gallery (optional)</div>
                                </div>
                            </div>
                        </figcaption>
                    </figure>
                    <div data-kg-card-toolbar="gallery"></div>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardToolbarContents: true});
    });

    it('can drop images when empty', async function () {
        const firstImagePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.jpeg');
        const secondImagePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await insertCard(page, {cardName: 'gallery'});

        // create and dispatch a file drag over
        const dataTransfer = await createDataTransfer(page, [
            {filePath: firstImagePath, fileName: 'large-image.jpg', fileType: 'image/jpeg'},
            {filePath: secondImagePath, fileName: 'large-image.png', fileType: 'image/png'}
        ]);
        await page.getByTestId('gallery-container').dispatchEvent('dragover', {dataTransfer});

        // dragover text should be visible
        await expect(await page.locator('[data-kg-card-drag-text="true"]')).toBeVisible();

        // drop files
        await page.getByTestId('gallery-container').dispatchEvent('drop', {dataTransfer});

        // check images were uploaded
        await expect(page.locator('[data-testid="gallery-image"]')).toHaveCount(2);
    });

    it('can drop images when populated', async function () {
        const prePopulatedImagePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.jpeg');
        const fileChooserPromise = page.waitForEvent('filechooser');

        const firstImagePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.jpeg');
        const secondImagePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await insertCard(page, {cardName: 'gallery'});

        await page.click('[name="placeholder-button"]');

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([prePopulatedImagePath]);

        await expect(page.locator('[data-testid="gallery-image"]')).toHaveCount(1);

        // create and dispatch a file drag over
        const dataTransfer = await createDataTransfer(page, [
            {filePath: firstImagePath, fileName: 'first-dropped.jpg', fileType: 'image/jpeg'},
            {filePath: secondImagePath, fileName: 'second-dropped.png', fileType: 'image/png'}
        ]);
        await page.getByTestId('gallery-container').dispatchEvent('dragover', {dataTransfer});

        // dragover text should be visible
        await expect(await page.locator('[data-kg-card-drag-text="true"]')).toBeVisible();

        // drop files
        await page.getByTestId('gallery-container').dispatchEvent('drop', {dataTransfer});

        // check images were uploaded
        await expect(page.locator('[data-testid="gallery-image"]')).toHaveCount(3);
    });

    it('limits uploads to 9 images', async function () {
        const filePaths = Array.from(Array(10).keys()).map(n => path.relative(process.cwd(), __dirname + `/../fixtures/large-image-${n}.png`));
        const fileChooserPromise = page.waitForEvent('filechooser');

        await focusEditor(page);
        await insertCard(page, {cardName: 'gallery'});
        await page.click('[name="placeholder-button"]');

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(filePaths);

        await expect(page.locator('[data-testid="gallery-image"]')).toHaveCount(9);
        await expect(page.getByTestId('gallery-error')).toContainText('9 images');

        await page.getByTestId('clear-gallery-error').click();

        await expect(page.getByTestId('gallery-error')).not.toBeVisible();
    });

    it('can add images via toolbar', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'gallery'});

        const firstImagePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.jpeg');
        const dataTransfer = await createDataTransfer(page, [
            {filePath: firstImagePath, fileName: 'first-dropped.jpg', fileType: 'image/jpeg'}
        ]);
        await page.getByTestId('gallery-container').dispatchEvent('dragover', {dataTransfer});
        await page.getByTestId('gallery-container').dispatchEvent('drop', {dataTransfer});

        await expect(page.locator('[data-testid="gallery-image"]')).toHaveCount(1);
        await expect(page.locator('[data-kg-card-toolbar="gallery"]')).toBeVisible();

        const fileChooserPromise = page.waitForEvent('filechooser');
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image-1.png');
        await page.click('[data-kg-card-toolbar="gallery"] [data-testid="add-gallery-image"]');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        await expect(page.locator('[data-testid="gallery-image"]')).toHaveCount(2);
    });
});
