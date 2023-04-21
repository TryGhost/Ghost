import createDataTransfer from '../../utils/createDataTransfer';
import path from 'path';
import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, createSnippet, enterUntilScrolled, expectUnchangedScrollPosition, focusEditor, html, initialize, pasteText, startApp} from '../../utils/e2e';
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
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="image">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('renders image card node', async function () {
        await focusEditor(page);
        await page.keyboard.type('image! ');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div data-testid="media-placeholder">
                            <div>
                                <button name="placeholder-button" type="button">
                                    <svg width="134" height="135" viewBox="0 0 134 135" xmlns="http://www.w3.org/2000/svg"></svg>
                                    <p>Click to select an image</p>
                                </button>
                            </div>
                        </div>
                        <form><input accept="image/*" hidden="" name="image-input" type="file" /></form>
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
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div><img alt="" src="blob:..." /></div>
                        <figcaption>
                            <input placeholder="Type alt text for image (optional)" value=""/>
                            <button name="alt-toggle-button" type="button">Alt</button>
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

    // NOTE: still works, but it's a focus issue
    test.todo('can paste html to caption', async function () {
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
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img alt="" src="blob:...">
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
                                </div>
                            </div>
                            <button name="alt-toggle-button" type="button">Alt</button>
                        </figcaption>
                    </figure>
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
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img alt="" src="blob:...">
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
                                </div>
                            </div>
                            <button name="alt-toggle-button" type="button">Alt</button>
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
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img alt="" src="blob:..." />
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
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="image">
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
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="image">
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
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img
                                alt="a group of people walking down a street next to tall buildings"
                                src="http://127.0.0.1:5173/Koenig-editor-1.png" />
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
                                </div>
                            </div>
                            <button name="alt-toggle-button" type="button">Alt</button>
                        </figcaption>
                    </figure>
                    <div data-kg-card-toolbar="image"></div>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardToolbarContents: true});
    });

    test('can insert tenor image', async () => {
        await mockTenorApi(page);
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');

        await page.click('button[data-kg-card-menu-item="GIF"]');

        // chose second gif from list
        await expect(await page.locator('[data-tenor-index="1"]')).toBeVisible();
        await page.click('[data-tenor-index="1"]');

        await expect(await page.getByTestId('image-card-populated')).toBeVisible();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img
                                alt=""
                                src="https://media.tenor.com/ocbMLlwniWQAAAAC/steve-harvey-oh.gif" />
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
                                </div>
                            </div>
                            <button name="alt-toggle-button" type="button">Alt</button>
                        </figcaption>
                    </figure>
                    <div data-kg-card-toolbar="image"></div>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardToolbarContents: true});
    });

    test('can insert tenor image with key Tab', async () => {
        await mockTenorApi(page);
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');

        await page.click('button[data-kg-card-menu-item="GIF"]');

        // chose third gif from list
        await expect(await page.locator('[data-tenor-index="2"]')).toBeVisible();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');

        await expect(await page.getByTestId('image-card-populated')).toBeVisible();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img
                                alt=""
                                src="https://media.tenor.com/Sm9aylrzSyMAAAAC/cats-animals.gif" />
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
                                </div>
                            </div>
                            <button name="alt-toggle-button" type="button">Alt</button>
                        </figcaption>
                    </figure>
                    <div data-kg-card-toolbar="image"></div>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardToolbarContents: true});
    });

    test('can close tenor selector on Esc', async () => {
        await mockTenorApi(page);
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');

        await page.click('button[data-kg-card-menu-item="GIF"]');

        await expect(await page.getByTestId('tenor-selector')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(await page.getByTestId('tenor-selector')).toBeHidden();
    });

    test('can show tenor error', async () => {
        await mockTenorApi(page, {status: 400});
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');

        await page.click('button[data-kg-card-menu-item="GIF"]');

        await expect(await page.getByTestId('tenor-selector-error')).toBeVisible();
    });

    test('can add snippet', async function () {
        // insert image
        await insertImage(page);

        // create snippet
        await page.keyboard.press('Escape');
        await createSnippet(page);

        // can insert card from snippet
        await page.keyboard.press('Enter');
        await page.keyboard.type('/snippet');
        await page.waitForSelector('[data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await expect(await page.locator('[data-kg-card="image"]')).toHaveCount(2);
    });

    test('can select caption text without scrolling', async function () {
        // Type in some text, so that we can scroll
        await focusEditor(page);
        await enterUntilScrolled(page);
        await insertImage(page);

        const paragraphCount = await page.locator('[data-kg="editor"] > div > p').count();

        await expectUnchangedScrollPosition(page, async () => {
            await page.keyboard.type('Captiontest--Captiontest');

            const captionEditor = page.locator('[data-testid="image-caption-editor"] [data-kg="editor"] p span');

            // Check contains text
            await expect(captionEditor).toHaveText('Captiontest--Captiontest');

            // Select the text
            // Get the bounding box of the span
            const box = await captionEditor.boundingBox();
            const y = box.y + box.height / 2;
            const startX = box.x + box.width / 2;
            const endX = box.x + box.width;

            await page.mouse.move(startX, y);
            await page.mouse.down();
            await page.mouse.move(endX, y);
            await page.mouse.up();

            await page.keyboard.type('world');

            // Check contains text
            await expect(captionEditor).toHaveText('Captiontest-world');

            // Press the enter key
            await page.keyboard.press('Enter');

            // Check if the image card is now deselected
            await expect(page.locator('[data-kg-card="image"]')).toHaveAttribute('data-kg-card-selected', 'false');

            // Check total paragraph count increased
            await expect(page.locator('[data-kg="editor"] > div > p')).toHaveCount(paragraphCount + 1);

            // Add some text
            await page.keyboard.type('last one');

            // Check contains text
            await expect(page.locator('[data-kg="editor"] > div > p:last-child').nth(1)).toHaveText('last one');
        });
    });

    test('can select caption text and make it italic', async function () {
        // Type in some text, so that we can scroll
        await focusEditor(page);
        await enterUntilScrolled(page);
        await insertImage(page);

        await expectUnchangedScrollPosition(page, async () => {
            await page.keyboard.type('Captiontest--Captiontest');

            const captionEditor = page.locator('[data-testid="image-caption-editor"] [data-kg="editor"] p span');

            // Check contains text
            await expect(captionEditor).toHaveText('Captiontest--Captiontest');

            // Select the left side of the text (deliberately a test in the other direction)
            // Get the bounding box of the span
            const box = await captionEditor.boundingBox();
            const y = box.y + box.height / 2;
            const startX = box.x + box.width / 2;
            const endX = box.x;

            await page.mouse.move(startX, y);
            await page.mouse.down();
            await page.mouse.move(endX, y);
            await page.mouse.up();

            // Click italic button
            await page.locator('[data-kg-toolbar-button="italic"]').click();

            // Check contains text
            await expect(captionEditor).toHaveText('-Captiontest');
            const italicSpan = page.locator('[data-testid="image-caption-editor"] [data-kg="editor"] p em').nth(0);
            await expect(italicSpan).toHaveText('Captiontest-');
        });
    });
});

async function insertImage(page) {
    const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

    await focusEditor(page);
    await page.keyboard.type('image! ');

    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        await page.click('button[name="placeholder-button"]')
    ]);
    await fileChooser.setFiles([filePath]);

    await expect(await page.getByTestId('image-card-populated')).toBeVisible();
}

function tenorTestData() {
    return (
        {
            locale: 'en',
            results: [
                {
                    id: '6897265628617702942',
                    title: '',
                    media_formats: {
                        tinygif: {
                            url: 'https://media.tenor.com/X7gCi8NE_h4AAAAM/cat-funny.gif',
                            duration: 0,
                            preview: '',
                            dims: [
                                220,
                                204
                            ],
                            size: 522164
                        },
                        gif: {
                            url: 'https://media.tenor.com/X7gCi8NE_h4AAAAC/cat-funny.gif',
                            duration: 0,
                            preview: '',
                            dims: [
                                498,
                                460
                            ],
                            size: 4870544
                        },
                        tinygifpreview: {
                            url: 'https://media.tenor.com/X7gCi8NE_h4AAAAF/cat-funny.png',
                            duration: 0,
                            preview: '',
                            dims: [
                                220,
                                204
                            ],
                            size: 21743
                        },
                        gifpreview: {
                            url: 'https://media.tenor.com/X7gCi8NE_h4AAAAe/cat-funny.png',
                            duration: 0,
                            preview: '',
                            dims: [
                                640,
                                592
                            ],
                            size: 141384
                        },
                        mp4: {
                            url: 'https://media.tenor.com/X7gCi8NE_h4AAAPo/cat-funny.mp4',
                            duration: 3.7,
                            preview: '',
                            dims: [
                                640,
                                592
                            ],
                            size: 754491
                        }
                    },
                    created: 1580334888.9161069,
                    content_description: 'Cat Funny GIF',
                    itemurl: 'https://tenor.com/view/cat-funny-fall-submit-play-gif-16179688',
                    url: 'https://tenor.com/bf3eS.gif',
                    tags: [
                        'cat',
                        'funny',
                        'fall',
                        'submit',
                        'play'
                    ],
                    flags: [],
                    hasaudio: false
                },
                {
                    id: '11657229184981764452',
                    title: '',
                    media_formats: {
                        tinygifpreview: {
                            url: 'https://media.tenor.com/ocbMLlwniWQAAAAF/steve-harvey-oh.png',
                            duration: 0,
                            preview: '',
                            dims: [
                                220,
                                124
                            ],
                            size: 11388
                        },
                        tinygif: {
                            url: 'https://media.tenor.com/ocbMLlwniWQAAAAM/steve-harvey-oh.gif',
                            duration: 0,
                            preview: '',
                            dims: [
                                220,
                                124
                            ],
                            size: 173121
                        },
                        gifpreview: {
                            url: 'https://media.tenor.com/ocbMLlwniWQAAAAe/steve-harvey-oh.png',
                            duration: 0,
                            preview: '',
                            dims: [
                                640,
                                360
                            ],
                            size: 65023
                        },
                        gif: {
                            url: 'https://media.tenor.com/ocbMLlwniWQAAAAC/steve-harvey-oh.gif',
                            duration: 0,
                            preview: '',
                            dims: [
                                498,
                                280
                            ],
                            size: 1669457
                        },
                        mp4: {
                            url: 'https://media.tenor.com/ocbMLlwniWQAAAPo/steve-harvey-oh.mp4',
                            duration: 2.4,
                            preview: '',
                            dims: [
                                640,
                                360
                            ],
                            size: 377541
                        }
                    },
                    created: 1600453059.6729331,
                    content_description: 'Steve Harvey Oh GIF',
                    itemurl: 'https://tenor.com/view/steve-harvey-oh-you-crazy-point-stop-gif-18502036',
                    url: 'https://tenor.com/bpNn6.gif',
                    tags: [
                        'Steve Harvey',
                        'oh',
                        'You Crazy',
                        'point',
                        'stop'
                    ],
                    flags: [],
                    hasaudio: false
                },
                {
                    id: '5363605506377337635',
                    title: '',
                    media_formats: {
                        gif: {
                            url: 'https://media.tenor.com/Sm9aylrzSyMAAAAC/cats-animals.gif',
                            duration: 0,
                            preview: '',
                            dims: [
                                498,
                                431
                            ],
                            size: 1574979
                        },
                        gifpreview: {
                            url: 'https://media.tenor.com/Sm9aylrzSyMAAAAe/cats-animals.png',
                            duration: 0,
                            preview: '',
                            dims: [
                                640,
                                554
                            ],
                            size: 153379
                        },
                        tinygifpreview: {
                            url: 'https://media.tenor.com/Sm9aylrzSyMAAAAF/cats-animals.png',
                            duration: 0,
                            preview: '',
                            dims: [
                                220,
                                190
                            ],
                            size: 25196
                        },
                        tinygif: {
                            url: 'https://media.tenor.com/Sm9aylrzSyMAAAAM/cats-animals.gif',
                            duration: 0,
                            preview: '',
                            dims: [
                                220,
                                190
                            ],
                            size: 236117
                        },
                        mp4: {
                            url: 'https://media.tenor.com/Sm9aylrzSyMAAAPo/cats-animals.mp4',
                            duration: 1.2,
                            preview: '',
                            dims: [
                                640,
                                554
                            ],
                            size: 265062
                        }
                    },
                    created: 1616817775.272332,
                    content_description: 'Cats Animals GIF',
                    itemurl: 'https://tenor.com/view/cats-animals-reaction-wow-surprised-gif-20914356',
                    url: 'https://tenor.com/bzUWu.gif',
                    tags: [
                        'cats',
                        'animals',
                        'reaction',
                        'wow',
                        'surprised'
                    ],
                    flags: [],
                    hasaudio: false
                }
            ]
        }
    );
}

const tenorUrl = 'https://tenor.googleapis.com/v2/featured?q=excited&media_filter=minimal&key=xxx&client_key=ghost-editor&contentfilter=off';
async function mockTenorApi(page, {status} = {status: 200}) {
    await page.route(tenorUrl, route => route.fulfill({
        status,
        body: JSON.stringify(tenorTestData())
    }));
}
