import createDataTransfer from '../../utils/createDataTransfer';
import path from 'path';
import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, focusEditor, html, initialize, pasteText, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

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
                </div>
            </div>
        `, {ignoreCardContents: true});
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

        await expect(await page.getByTestId('image-card-populated')).toBeVisible();
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

        // placeholder is replaced with uploading image
        await expect(await page.getByTestId('image-card-populated')).toBeVisible();

        // wait for upload to complete
        await expect(await page.getByTestId('progress-bar')).toBeHidden();

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

        // placeholder is replaced with uploading image
        await expect(await page.getByTestId('image-card-populated')).toBeVisible();

        // wait for upload to complete
        await expect(await page.getByTestId('progress-bar')).toBeHidden();

        await page.click('[data-testid="image-caption-editor"]');
        await page.keyboard.type('This is a caption');
        await expect(await page.locator('text="This is a caption"')).toBeVisible();
    });

    test('can past html to caption', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);

        await page.waitForSelector('[data-testid="image-caption-editor"]');
        await page.click('[data-testid="image-caption-editor"]');
        await pasteText(page, 'This is link <a href="https://ghost.org/changelog/markdown/">ghost.org/changelog/markdown/</a>', 'text/html');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img src="blob:..." alt="">
                        </div>
                        <figcaption>
                            <div data-testid="image-caption-editor">
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="true" spellcheck="true" data-lexical-editor="true" data-koenig-dnd-container="true" role="textbox">
                                            <p dir="ltr" data-koenig-dnd-droppable="true">
                                                <span data-lexical-text="true">This is link </span>
                                                <a href="https://ghost.org/changelog/markdown/" dir="ltr">
                                                    <span data-lexical-text="true">ghost.org/changelog/markdown/</span>
                                                </a>
                                            </p>
                                        </div>
                                    </div>
                                    <div id="koenig-drag-drop-ghost-container"></div>
                                </div>
                            </div>
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

        await page.click('[data-kg-card="image"]');

        expect(await page.locator('[data-kg-card-toolbar="image"]')).not.toBeNull();

        const [replacefileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('[data-kg-card-toolbar="image"] button[aria-label="Replace"]')
        ]);
        await replacefileChooser.setFiles([filePath2]);

        // placeholder is replaced with uploading image
        await expect(await page.getByTestId('image-card-populated')).toBeVisible();

        // wait for upload to complete
        await expect(await page.getByTestId('progress-bar')).toBeHidden();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img src="blob:..." alt="">
                        </div>
                        <figcaption>
                            <div data-testid="image-caption-editor">
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="true" spellcheck="true" data-lexical-editor="true" data-koenig-dnd-container="true" role="textbox">
                                            <p><br /></p>
                                        </div>
                                    </div>
                                    <div>Type caption for image (optional)</div>
                                    <div id="koenig-drag-drop-ghost-container"></div>
                                </div>
                            </div>
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

        // placeholder is replaced with uploading image
        await expect(await page.getByTestId('image-card-populated')).toBeVisible();

        // wait for upload to complete
        await expect(await page.getByTestId('progress-bar')).toBeHidden();

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

        // placeholder is replaced with uploading image
        await expect(await page.getByTestId('image-card-populated')).toBeVisible();

        // wait for upload to complete
        await expect(await page.getByTestId('progress-bar')).toBeHidden();

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

        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'large-image.png', fileType: 'image/png'}]);

        await page.locator('[data-kg-card="image"] [data-testid="media-placeholder"]').dispatchEvent('dragenter', {dataTransfer});

        expect(await page.locator('[data-kg-card-drag-text="true"]')).not.toBeNull();

        await page.locator('[data-kg-card="image"] [data-testid="media-placeholder"]').dispatchEvent('dragleave', {dataTransfer});

        await expect(await page.locator('[data-kg-card-drag-text="true"]')).toHaveCount(0);
    });

    test('can handle image drop', async function () {
        await focusEditor(page);
        await page.keyboard.type('image! ');

        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const dataTransfer = await createDataTransfer(page, [{filePath, fileName: 'large-image.png', fileType: 'image/png'}]);

        await page.locator('[data-kg-card="image"] [data-testid="media-placeholder"]').dispatchEvent('dragenter', {dataTransfer});

        // Dragover text should be visible
        await expect(await page.locator('[data-kg-card-drag-text="true"]')).toBeVisible();

        await page.locator('[data-kg-card="image"] [data-testid="media-placeholder"]').dispatchEvent('drop', {dataTransfer});

        // placeholder is replaced with uploading image
        await expect(await page.getByTestId('image-card-populated')).toBeVisible();

        // wait for upload to complete
        await expect(await page.getByTestId('progress-bar')).toBeHidden();

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

    test('adds extra paragraph when image is inserted at end of document', async function () {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');

        await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('[data-kg-card-menu-item="Image"]')
        ]);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('does not add extra paragraph when image is inserted mid-document', async function () {
        await focusEditor(page);
        await page.keyboard.press('Enter');
        await page.keyboard.type('Testing');
        await page.keyboard.press('ArrowUp');
        await page.click('[data-kg-plus-button]');

        await Promise.all([
            page.waitForEvent('filechooser'),
            page.click('[data-kg-card-menu-item="Image"]')
        ]);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                </div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
        `, {ignoreCardContents: true});
    });

    test('can insert unsplash image', async () => {
        const testData = [
            {
                id: 'SgvrLyGKnHw',
                created_at: '2023-02-27T20:39:45Z',
                updated_at: '2023-03-01T06:08:01Z',
                promoted_at: '2023-03-01T06:08:01Z',
                width: 5504,
                height: 8256,
                color: '#8c8c8c',
                blur_hash: 'LHD]Vg4m%fIA_3D%%2MxIoWCs.s:',
                description: null,
                alt_description: 'a group of people walking down a street next to tall buildings',
                urls: {
                    raw: 'http://127.0.0.1:5173/Koenig-editor-1.png',
                    full: 'http://127.0.0.1:5173/Koenig-editor-1.png',
                    regular: 'http://127.0.0.1:5173/Koenig-editor-1.png',
                    small: 'http://127.0.0.1:5173/Koenig-editor-1.png',
                    thumb: 'http://127.0.0.1:5173/Koenig-editor-1.png',
                    small_s3: 'http://127.0.0.1:5173/Koenig-editor-1.png'
                },
                links: {
                    self: 'https://api.unsplash.com/photos/SgvrLyGKnHw',
                    html: 'https://unsplash.com/photos/SgvrLyGKnHw',
                    download: 'https://unsplash.com/photos/SgvrLyGKnHw/download?ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjc3NjUxMzk5',
                    download_location: 'https://api.unsplash.com/photos/SgvrLyGKnHw/download?ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjc3NjUxMzk5'
                },
                likes: 1,
                liked_by_user: false,
                current_user_collections: [],
                sponsorship: null,
                topic_submissions: {},
                user: {
                    id: '9_671Bq5l40',
                    updated_at: '2023-03-01T06:08:01Z',
                    username: 'jamillatrach',
                    name: 'Latrach Med Jamil',
                    first_name: 'Latrach',
                    last_name: 'Med Jamil',
                    twitter_username: null,
                    portfolio_url: null,
                    bio: 'Just trying to share what I have --\r\n\r\nInstagram.com/jamillatrach/',
                    location: 'Düsseldorf',
                    links: {
                        self: 'https://api.unsplash.com/users/jamillatrach',
                        html: 'https://unsplash.com/@jamillatrach',
                        photos: 'https://api.unsplash.com/users/jamillatrach/photos',
                        likes: 'https://api.unsplash.com/users/jamillatrach/likes',
                        portfolio: 'https://api.unsplash.com/users/jamillatrach/portfolio',
                        following: 'https://api.unsplash.com/users/jamillatrach/following',
                        followers: 'https://api.unsplash.com/users/jamillatrach/followers'
                    },
                    profile_image: {
                        small: 'https://images.unsplash.com/profile-fb-1570626489-2f1895a616ca.jpg?ixlib=rb-4.0.3\u0026crop=faces\u0026fit=crop\u0026w=32\u0026h=32',
                        medium: 'https://images.unsplash.com/profile-fb-1570626489-2f1895a616ca.jpg?ixlib=rb-4.0.3\u0026crop=faces\u0026fit=crop\u0026w=64\u0026h=64',
                        large: 'https://images.unsplash.com/profile-fb-1570626489-2f1895a616ca.jpg?ixlib=rb-4.0.3\u0026crop=faces\u0026fit=crop\u0026w=128\u0026h=128'
                    },
                    instagram_username: 'jamillatrach',
                    total_collections: 0,
                    total_likes: 4,
                    total_photos: 451,
                    accepted_tos: true,
                    for_hire: false,
                    social: {
                        instagram_username: 'jamillatrach',
                        portfolio_url: null,
                        twitter_username: null,
                        paypal_email: null
                    }
                }
            }
        ];
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');

        await page.click('button[data-kg-card-menu-item="Unsplash"]');

        // mock unsplash api
        await page.route('https://api.unsplash.com/photos?per_page=30', route => route.fulfill({
            status: 200,
            body: JSON.stringify(testData)
        }));
        await page.click('[data-kg-unsplash-insert-button]');
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img
                                src="http://127.0.0.1:5173/Koenig-editor-1.png"
                                alt="a group of people walking down a street next to tall buildings" />
                        </div>
                        <figcaption>
                            <div data-testid="image-caption-editor">
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="true" spellcheck="true" data-lexical-editor="true" data-koenig-dnd-container="true" role="textbox">
                                            <p><br /></p>
                                        </div>
                                    </div>
                                    <div>Type caption for image (optional)</div>
                                    <div id="koenig-drag-drop-ghost-container"></div>
                                </div>
                            </div>
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
