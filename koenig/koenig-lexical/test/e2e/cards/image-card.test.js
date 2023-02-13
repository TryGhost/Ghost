import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {expect} from '@playwright/test';
import {startApp, initialize, focusEditor, assertHTML, html} from '../../utils/e2e';
import path from 'path';
import {readFileSync} from 'fs';

describe('Image card', async () => {
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

    test('can import serialized image card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'image',
                        src: '/content/images/2022/11/koenig-lexical.jpg',
                        width: 3840,
                        height: 2160,
                        title: 'This is a title',
                        altText: 'This is some alt text',
                        caption: 'This is a <b>caption</b>',
                        cardWidth: 'wide'
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
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="wide">
                        <div>
                            <img
                                src="/content/images/2022/11/koenig-lexical.jpg"
                                alt="This is some alt text"
                            />
                        </div>
                        <figcaption>
                            <input
                                placeholder="Type caption for image (optional)"
                                value="This is a <b>caption</b>"
                            />
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                </div>
            </div>
        `);
    });

    test('renders image card node', async function () {
        await focusEditor(page);
        await page.keyboard.type('image! ');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div data-testid="media-placeholder">
                            <div>
                                <button name="placeholder-button">
                                    <svg width="134" height="135" viewBox="0 0 134 135" xmlns="http://www.w3.org/2000/svg"></svg>
                                    <p>Click to select an image</p>
                                </button>
                            </div>
                        </div>
                        <form><input name="image-input" type="file" hidden="" accept="image/*" /></form>
                    </figure>
                </div>
            </div>
            <div contenteditable="false" data-lexical-cursor="true"></div>
        `);
    });

    test('can upload an image', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);

        // Check progress bar
        await expect(await page.getByTestId('upload-progress')).toBeVisible();

        // wait for upload to complete
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div><img src="blob:..." alt="" /></div>
                        <figcaption>
                            <input placeholder="Type caption for image (optional)" value="" />
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                    <div data-kg-card-toolbar="image"></div>
                </div>
            </div>
        `, {ignoreCardToolbarContents: true});
    });

    test.todo('can get image width and height');

    test('can toggle to alt text', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);

        // wait for upload to complete
        await page.waitForSelector('[data-testid="upload-progress"]');
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        await page.click('button[name="alt-toggle-button"]');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div><img src="blob:..." alt="" /></div>
                        <figcaption>
                            <input placeholder="Type alt text for image (optional)" value=""/>
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                    <div data-kg-card-toolbar="image"></div>
                </div>
            </div>
        `, {ignoreCardToolbarContents: true});
    });

    test('renders caption if present', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);

        // wait for upload to complete
        await page.waitForSelector('[data-testid="upload-progress"]');
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        await page.click('input[placeholder="Type caption for image (optional)"]');
        await page.keyboard.type('This is a caption');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div><img src="blob:..." alt="" /></div>
                        <figcaption>
                            <input placeholder="Type caption for image (optional)" value="This is a caption" />
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                    <div data-kg-card-toolbar="image"></div>
                </div>
            </div>
        `, {ignoreCardToolbarContents: true});
    });

    test('renders image card toolbar', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);
        await page.click('[data-kg-card="image"]');

        // wait for upload to complete
        await page.waitForSelector('[data-testid="upload-progress"]');
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        expect(await page.$('[data-kg-card-toolbar="image"]')).not.toBeNull();
    });

    test('image card toolbar has Regular button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);
        await page.click('[data-kg-card="image"]');

        // wait for upload to complete
        await page.waitForSelector('[data-testid="upload-progress"]');
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        expect(await page.$('[data-kg-card-toolbar="image"] button[aria-label="Regular"]')).not.toBeNull();
    });

    test('image card toolbar has Wide button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);
        await page.click('[data-kg-card="image"]');

        // wait for upload to complete
        await page.waitForSelector('[data-testid="upload-progress"]');
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        expect(await page.$('[data-kg-card-toolbar="image"] button[aria-label="Wide"]')).not.toBeNull();
    });

    test('image card toolbar has Full button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);
        await page.click('[data-kg-card="image"]');

        // wait for upload to complete
        await page.waitForSelector('[data-testid="upload-progress"]');
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        expect(await page.$('[data-kg-card-toolbar="image"] button[aria-label="Full"]')).not.toBeNull();
    });

    test('image card toolbar has Link button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);
        await page.click('[data-kg-card="image"]');

        // wait for upload to complete
        await page.waitForSelector('[data-testid="upload-progress"]');
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        expect(await page.$('[data-kg-card-toolbar="image"] button[aria-label="Link"]')).not.toBeNull();
    });

    test('image card toolbar has Replace button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);
        await page.click('[data-kg-card="image"]');

        // wait for upload to complete
        await page.waitForSelector('[data-testid="upload-progress"]');
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        expect(await page.$('[data-kg-card-toolbar="image"] button[aria-label="Replace"]')).not.toBeNull();
    });

    test('image card toolbar has Snippet button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);
        await page.click('[data-kg-card="image"]');

        // wait for upload to complete
        await page.waitForSelector('[data-testid="upload-progress"]');
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        expect(await page.$('[data-kg-card-toolbar="image"] button[aria-label="Snippet"]')).not.toBeNull();
    });

    test('can replace image from image toolbar button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const filePath2 = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.jpeg');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);

        // wait for upload to complete
        await page.waitForSelector('[data-testid="upload-progress"]');
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        await page.click('[data-kg-card="image"]');

        expect(await page.locator('[data-kg-card-toolbar="image"]')).not.toBeNull();

        const [replacefileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('[data-kg-card-toolbar="image"] button[aria-label="Replace"]')
        ]);
        await replacefileChooser.setFiles([filePath2]);

        // wait for upload to complete
        await page.waitForSelector('[data-testid="upload-progress"]');
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div><img src="blob:..." alt="" /></div>
                        <figcaption>
                            <input placeholder="Type caption for image (optional)" value="" />
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                    <div data-kg-card-toolbar="image"></div>
                </div>
            </div>
        `, {ignoreCardToolbarContents: true});
    });

    test('toolbar can toggle image sizes', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);

        // wait for upload to complete
        await page.waitForSelector('[data-testid="upload-progress"]');
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        await page.click('[data-kg-card="image"]');

        expect(await page.locator('[data-kg-card-toolbar="image"]')).not.toBeNull();

        await page.click('[data-kg-card-toolbar="image"] button[aria-label="Wide"]');
        expect (await page.locator('[data-kg-card-width="wide"]')).not.toBeNull();

        await page.click('[data-kg-card-toolbar="image"] button[aria-label="Full"]');
        expect (await page.locator('[data-kg-card-width="full"]')).not.toBeNull();

        await page.click('[data-kg-card-toolbar="image"] button[aria-label="Regular"]');
        expect (await page.locator('[data-kg-card-width="regular"]')).not.toBeNull();
    });

    test('toolbar does not disappear on click', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);

        // wait for upload to complete
        await page.waitForSelector('[data-testid="upload-progress"]');
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        await page.click('figure');

        await page.click('[data-kg-card-toolbar="image"] button[aria-label="Regular"]');

        expect(await page.$('[data-kg-card-toolbar="image"]')).not.toBeNull();
    });

    test('file input opens immediately when added via card menu', async function () {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('[data-kg-card-menu-item="Image"]')
        ]);

        expect(fileChooser).not.toBeNull();
    });

    test('can handle drag over & leave', async function () {
        await focusEditor(page);
        await page.keyboard.type('image! ');

        const imageCard = await page.$('[data-kg-card="image"]');
        expect(imageCard).not.toBeNull();

        const dataTransfer = await page.evaluateHandle(() => {
            const dt = new DataTransfer();
            const file = new File([''], 'image.png', {type: 'image/png'});
            dt.items.add(file);
            return dt;
        });
        await page.dispatchEvent(
            '[data-kg-card="image"] [data-testid="media-placeholder"]',
            'dragenter',
            {dataTransfer}
        );

        expect(await page.$('[data-kg-card-drag-text="true"]')).not.toBeNull();

        await page.dispatchEvent(
            '[data-kg-card="image"] [data-testid="media-placeholder"]',
            'dragleave',
            {dataTransfer}
        );

        expect(await page.$('[data-kg-card-drag-text="true"]')).toBeNull();
    });

    test('can handle image drop', async function () {
        await focusEditor(page);
        await page.keyboard.type('image! ');

        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const buffer = readFileSync(filePath);

        const dataTransfer = await page.evaluateHandle((data) => {
            const dt = new DataTransfer();
            const file = new File([data.toString('hex')], 'large-image.png', {type: 'image/png'});
            dt.items.add(file);
            return dt;
        }, buffer);

        await page.dispatchEvent(
            '[data-kg-card="image"] [data-testid="media-placeholder"]',
            'dragenter',
            {dataTransfer}
        );
        await page.dispatchEvent(
            '[data-kg-card="image"] [data-testid="media-placeholder"]',
            'drop',
            {dataTransfer}
        );

        // wait for upload to complete
        await expect(await page.getByTestId('upload-progress')).not.toBeVisible();

        // placeholder is replaced with uploading image
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img src="blob:..." alt="" />
                        </div>
                    </figure>
                </div>
            </div>
            <div contenteditable="false" data-lexical-cursor="true"></div>
        `);
    });

    // TODO: Switch to mocked API. Currently uses real Unsplash API so the asserted test data isn't stable
    test.skip('can insert unsplash image', async () => {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await page.click('[data-kg-unsplash-insert-button]');
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img
                                src="https://images.unsplash.com/photo-1574948495680-f67aab1ec3ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8c2VhcmNofDMyMXx8c3VtbWVyfGVufDB8fHx8MTY2OTEwNDUwNw&ixlib=rb-4.0.3&q=80&w=1200"
                                alt="upload in progress, 0 " />
                        </div>
                        <figcaption>
                            <input placeholder="Type caption for image (optional)" value="Photo by Mailchimp on Unsplash" />
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                    <div data-kg-card-toolbar="image"></div>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardToolbarContents: true});
    });
});
