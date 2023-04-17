import createDataTransfer from '../../utils/createDataTransfer';
import path from 'path';
import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, createSnippet, focusEditor, html, initialize, insertCard, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

describe('Product card', async () => {
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

    test('can import serialized product card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'product',
                        imgSrc: '/content/images/2022/11/koenig-lexical.jpg',
                        title: '<span>This is <em>title</em></span>',
                        description: '<p dir="ltr"><span>Description</span></p>',
                        buttonUrl: 'https://google.com/',
                        buttonText: 'Button',
                        isButtonEnabled: true,
                        isRatingEnabled: true
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
                <div
                    data-kg-card-editing="false"
                    data-kg-card-selected="false"
                    data-kg-card="product">
                    <div>
                        <div><img src="/content/images/2022/11/koenig-lexical.jpg" /></div>
                        <div>
                            <div>
                                <div>
                                    <div data-kg="editor">
                                        <div
                                            contenteditable="false"
                                            spellcheck="true"
                                            data-lexical-editor="true"
                                            aria-autocomplete="none">
                                            <p dir="ltr">
                                                <span data-lexical-text="true">This is</span>
                                                <em data-lexical-text="true">title</em>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <button type="button"><svg></svg></button>
                                <button type="button"><svg></svg></button>
                                <button type="button"><svg></svg></button>
                                <button type="button"><svg></svg></button>
                                <button type="button"><svg></svg></button>
                            </div>
                        </div>
                        <div>
                            <div>
                                <div data-kg="editor">
                                    <div
                                        contenteditable="false"
                                        spellcheck="true"
                                        data-lexical-editor="true"
                                        aria-autocomplete="none">
                                        <p dir="ltr"><span data-lexical-text="true">Description</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <a href="https://google.com/"><span>Button</span></a>
                        </div>
                    </div>
                    <div></div>
                </div>
            </div>
            `, {ignoreCardToolbarContents: true, ignoreInnerSVG: true});
    });

    test('renders product card node', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'product'});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="product"></div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can upload image file', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'product'});
        await uploadImg(page);

        // Image should be visible
        const mediaPlaceholder = await page.getByTestId('media-placeholder');
        await expect(await page.getByTestId('product-card-image')).toBeVisible();
        await expect(mediaPlaceholder).toBeHidden();

        // Can remove image
        const replaceButton = page.getByTestId('replace-product-image');
        await replaceButton.click();
        await expect(await page.getByTestId('media-placeholder')).toBeVisible();
    });

    test('can show errors for failed image upload', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'product'});
        await uploadImg(page, 'large-image-fail.jpeg');

        // Errors should be visible
        await expect(await page.getByTestId('media-placeholder-errors')).toBeVisible();
    });

    test('can upload dropped image', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await insertCard(page, {cardName: 'product'});

        // Placeholder should be visible
        await expect(await page.getByTestId('media-placeholder')).toBeVisible();

        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'large-image.png', fileType: 'image/png'}]);
        await page.getByTestId('media-placeholder').dispatchEvent('dragover', {dataTransfer});

        // Dragover text should be visible
        await expect(await page.locator('[data-kg-card-drag-text="true"]')).toBeVisible();

        // Drop file
        await page.getByTestId('media-placeholder').dispatchEvent('drop', {dataTransfer});

        // Image should be visible
        await expect(await page.getByTestId('product-card-image')).toBeVisible();
    });

    test('can show errors if was dropped a file with wrong extension', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image-fail.jpeg');

        await focusEditor(page);
        await insertCard(page, {cardName: 'product'});

        // Placeholder should be visible
        await expect(await page.getByTestId('media-placeholder')).toBeVisible();

        // Create and dispatch data transfer
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'large-image-fail.png', fileType: 'image/jpeg'}]);
        await page.getByTestId('media-placeholder').dispatchEvent('dragover', {dataTransfer});

        // Dragover text should be visible
        await expect(await page.locator('[data-kg-card-drag-text="true"]')).toBeVisible();

        // Drop file
        await page.getByTestId('media-placeholder').dispatchEvent('drop', {dataTransfer});

        // Errors should be visible
        await expect(await page.getByTestId('media-placeholder-errors')).toBeVisible();
    });

    test('can show/hide rating starts if rating enabled/disabled', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'product'});

        // Rating toggle should be visible and unchecked
        const productRating = await page.getByTestId('product-rating-toggle');
        await expect(productRating).toBeVisible();
        await expect(await page.locator('[data-testid="product-rating-toggle"] input').isChecked()).toBeFalsy();

        // Stars should be hidden
        const productStars = await page.getByTestId('product-stars');
        await expect(productStars).toBeHidden();

        // Stars should be visible after rating enabled
        await productRating.check();
        await expect(productStars).toBeVisible();
    });

    test('can show/hide button if button settings was enabled/disabled', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'product'});

        // Button toggle should be visible and unchecked
        const productButtonToggle = await page.getByTestId('product-button-toggle');
        await expect(productButtonToggle).toBeVisible();
        await expect(await page.locator('[data-testid="product-button-toggle"] input').isChecked()).toBeFalsy();

        // Button should be hidden in card
        const productButton = await page.getByTestId('product-button');
        await expect(productButton).toBeHidden();

        // Button should be visible after button enabled in settings
        await productButtonToggle.check();
        await expect(productButton).toBeVisible();

        // Fill button text and url in settings
        await page.getByTestId('product-button-text-input').fill('Button text');
        await page.getByTestId('product-button-url-input').fill('https://google.com/');

        // Button should be filled and visible in card
        const button = await page.getByTestId('product-button');
        await expect(button).toBeVisible();
        await expect(await page.getByTestId('product-button-span')).toContainText('Button text');
        await expect(await button.getAttribute('href')).toEqual('https://google.com/');
    });

    test('can fill title and description', async () => {
        await focusEditor(page);
        await insertCard(page, {cardName: 'product'});
        await page.keyboard.type('Title');

        // Move to description
        await page.keyboard.press('Enter');

        await page.keyboard.type('Description');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div
                    data-kg-card-editing="true"
                    data-kg-card-selected="true"
                    data-kg-card="product">
                    <div>
                        <div>
                            <div>
                                <div>
                                    <button name="placeholder-button" type="button">
                                        <svg></svg>
                                        <p>Click to select a product image</p>
                                    </button>
                                </div>
                            </div>
                            <form>
                                <input
                                    accept="image/gif,image/jpg,image/jpeg,image/png,image/svg+xml,image/webp"
                                    hidden=""
                                    name="image-input"
                                    type="file" />
                            </form>
                        </div>
                        <div>
                            <div>
                                <div>
                                    <div data-kg="editor">
                                        <div
                                            contenteditable="true"
                                            spellcheck="true"
                                            data-lexical-editor="true"
                                            role="textbox">
                                            <p dir="ltr"><span data-lexical-text="true">Title</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div>
                                <div data-kg="editor">
                                    <div
                                        contenteditable="true"
                                        spellcheck="true"
                                        data-lexical-editor="true"
                                        role="textbox">
                                        <p dir="ltr"><span data-lexical-text="true">Description</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div draggable="true">
                            <div>
                                <div><div>Rating</div></div>
                                <div>
                                    <label id="product-rating-toggle">
                                        <input type="checkbox" />
                                        <div></div>
                                    </label>
                                </div>
                            </div>
                            <hr />
                            <div>
                                <div><div>Button</div></div>
                                <div>
                                    <label id="product-button-toggle">
                                        <input type="checkbox" />
                                        <div></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <p><br /></p>
            `, {ignoreCardToolbarContents: true, ignoreInnerSVG: true});
    });

    test('can add snippet', async function () {
        await focusEditor(page);
        // insert new card
        await insertCard(page, {cardName: 'product'});

        // fill card
        await expect(await page.locator('[data-kg-card="product"]')).toBeVisible();
        await page.keyboard.type('snippet');
        await page.keyboard.press('Escape');

        // create snippet
        await createSnippet(page);

        // can insert card from snippet
        await page.keyboard.press('Enter');
        await page.keyboard.type('/snippet');
        await page.waitForSelector('[data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await expect(await page.locator('[data-kg-card="product"]')).toHaveCount(2);
    });

    test('renders product card toolbar', async () => {
        await focusEditor(page);
        await insertCard(page, {cardName: 'product'});
        await page.keyboard.type('Title');

        // Leave editing mode to display the toolbar
        await page.keyboard.press('Escape');

        // Check that the toolbar is displayed
        await expect(await page.locator('[data-kg-card-toolbar="product"]')).toBeVisible();

        // Edit video card
        await page.waitForSelector('[data-testid="edit-product-card"]');
        await page.getByTestId('edit-product-card').click();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="product">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });
});

async function uploadImg(page, src = 'large-image.png') {
    // Placeholder should be visible
    const mediaPlaceholder = await page.getByTestId('media-placeholder');
    await expect(mediaPlaceholder).toBeVisible();

    // Upload image
    const imagePath = path.relative(process.cwd(), __dirname + `/../fixtures/${src}`);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await mediaPlaceholder.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([imagePath]);
}
