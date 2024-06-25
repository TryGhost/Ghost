import path from 'path';
import {assertHTML, createDataTransfer, ctrlOrCmd, dragMouse, focusEditor, getEditorState, html, initialize, insertCard} from '../../utils/e2e';
import {expect, test} from '@playwright/test';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Gallery card', async () => {
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

    test('can import serialized gallery card nodes', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
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
        }));

        await initialize({page, uri: `/#/?content=${contentParam}`});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-kg-card-width="wide">
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
                                                <button aria-label="Delete" type="button">
                                                    <svg></svg>
                                                    <div><span>Delete</span></div>
                                                </button>
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
                                                <button aria-label="Delete" type="button">
                                                    <svg></svg>
                                                    <div><span>Delete</span></div>
                                                </button>
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

    test('can insert gallery card', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'gallery'});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-kg-card-width="wide">
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
                            <div data-kg-allow-clickthrough="true">
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="true" role="textbox" spellcheck="true" data-lexical-editor="true">
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

    test('can upload images', async function () {
        const fileChooserPromise = page.waitForEvent('filechooser');
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.jpeg');

        await focusEditor(page);
        await insertCard(page, {cardName: 'gallery'});
        await page.click('[name="placeholder-button"]');

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        await page.waitForSelector('[data-gallery="true"]');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-kg-card-width="wide">
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
                                                <button aria-label="Delete" type="button">
                                                    <svg></svg>
                                                    <div><span>Delete</span></div>
                                                </button>
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
                            <div data-kg-allow-clickthrough="true">
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="true" role="textbox" spellcheck="true" data-lexical-editor="true">
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

    test('can drop images when empty', async function () {
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

    test('can drop images when populated', async function () {
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

    test('limits uploads to 9 images', async function () {
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

    test('can add images via toolbar', async function () {
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

    test('can undo/redo without losing nested editor content', async () => {
        await test.step('insert and upload images to gallery card', async () => {
            const filePaths = Array.from(Array(2).keys()).map(n => path.relative(process.cwd(), __dirname + `/../fixtures/large-image-${n}.png`));
            const fileChooserPromise = page.waitForEvent('filechooser');

            await focusEditor(page);
            await insertCard(page, {cardName: 'gallery'});
            await page.click('[name="placeholder-button"]');

            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(filePaths);

            await expect(page.locator('[data-testid="gallery-image"]')).toHaveCount(2);
        });

        await page.click('[data-testid="gallery-card-caption"]');
        await page.keyboard.type('Caption');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');
        await expect(page.locator('[data-testid="gallery-image"]')).toHaveCount(0);
        await page.keyboard.press(`${ctrlOrCmd()}+z`);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-kg-card-width="wide">
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
                                                <button aria-label="Delete" type="button">
                                                    <svg></svg>
                                                    <div><span>Delete</span></div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div data-image="true">
                                        <img
                                            height="248"
                                            src="blob:..."
                                            width="248" />
                                        <div>
                                            <div>
                                                <button aria-label="Delete" type="button">
                                                    <svg></svg>
                                                    <div><span>Delete</span></div>
                                                </button>
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
                          <div data-kg-allow-clickthrough="true">
                            <div>
                              <div data-kg="editor">
                                <div
                                  contenteditable="true"
                                  role="textbox"
                                  spellcheck="true"
                                  data-lexical-editor="true"
                                >
                                  <p dir="ltr"><span data-lexical-text="true">Caption</span></p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </figcaption>
                    </figure>
                    <div data-kg-card-toolbar="gallery"></div>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardToolbarContents: true, ignoreInnerSVG: true});
    });

    // Skipped test because I couldn't get the drag to initiate with the image
    // rather than the whole gallery.
    //
    // test('can drag image card out of gallery card', async function () {
    //     await test.step('insert and upload images to gallery card', async () => {
    //         const filePaths = Array.from(Array(2).keys()).map(n => path.relative(process.cwd(), __dirname + `/../fixtures/large-image-${n}.png`));
    //         const fileChooserPromise = page.waitForEvent('filechooser');

    //         await focusEditor(page);
    //         await insertCard(page, {cardName: 'gallery'});
    //         await page.click('[name="placeholder-button"]');

    //         const fileChooser = await fileChooserPromise;
    //         await fileChooser.setFiles(filePaths);

    //         await expect(page.locator('[data-testid="gallery-image"]')).toHaveCount(2);
    //     });

    //     const firstImageBBox = await page.locator('[data-testid="gallery-image"]').nth(0).boundingBox();
    //     const paragraphBBox = await page.locator('p:not(figure p)').boundingBox();

    //     await dragMouse(page, firstImageBBox, paragraphBBox, 'middle', 'start', true, 100, 100);

    //     await assertHTML(page, `
    //     `, {ignoreCardContents: true});
    // });

    test('can drag populated image card onto empty gallery card', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'gallery'});
        await page.keyboard.press('Enter');
        await insertCard(page, {cardName: 'image'});

        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('[data-kg-card="image"] button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);

        const imageBBox = await page.locator('[data-kg-card="image"]').nth(0).boundingBox();
        const galleryBBox = await page.locator('[data-kg-card="gallery"]').nth(0).boundingBox();

        await dragMouse(page, imageBBox, galleryBBox, 'middle', 'middle', true, 100, 100);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-kg-card-width="wide">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="gallery">
                    <figure>
                    <div>
                        <div data-gallery="true">
                        <div data-row="0">
                            <div data-image="true">
                            <img alt="" height="248" src="blob:..." width="248" />
                            <div>
                                <div>
                                    <button aria-label="Delete" type="button">
                                        <svg></svg>
                                        <div><span>Delete</span></div>
                                    </button>
                                </div>
                            </div>
                            </div>
                        </div>
                        </div>
                        <form>
                        <input accept="image/gif,image/jpg,image/jpeg,image/png,image/svg+xml,image/webp" hidden="" multiple=""
                            name="image-input" type="file" />
                        </form>
                    </div>
                    </figure>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: false});
    });

    test('exports all 9 images', async function () {
        // necessary to check the saved data because the gallery card state is not
        // directly synchronized with the editor state at time of testing
        // (it keeps it's own state for easier handling of loading states, etc.)

        await test.step('insert and upload images to gallery card', async () => {
            const filePaths = Array.from(Array(9).keys()).map(n => path.relative(process.cwd(), __dirname + `/../fixtures/large-image-${n}.png`));
            const fileChooserPromise = page.waitForEvent('filechooser');

            await focusEditor(page);
            await insertCard(page, {cardName: 'gallery'});
            await page.click('[name="placeholder-button"]');

            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(filePaths);

            await expect(page.locator('[data-testid="gallery-image"]')).toHaveCount(9);
        });

        const editorState = await getEditorState(page);

        expect(editorState.root.children[0].type).toEqual('gallery');
        expect(editorState.root.children[0].images).toHaveLength(9);
    });
});
