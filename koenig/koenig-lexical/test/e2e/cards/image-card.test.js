import {afterAll, beforeAll, beforeEach, describe, test, expect} from 'vitest';
import {startApp, initialize, focusEditor, assertHTML, html} from '../../utils/e2e';
import path from 'path';

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

    test('renders image card node', async function () {
        await focusEditor(page);
        await page.keyboard.type('image! ');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="false" data-kg-card="image">
                    <figure>
                        <div>
                            <div>
                                <button name="placeholder-button">
                                    <svg width="134" height="135" viewBox="0 0 134 135" xmlns="http://www.w3.org/2000/svg"></svg>
                                    <p>Click to select an image</p>
                                </button>
                            </div>
                        </div>
                        <form><input name="image-input" type="file" accept="image/*" hidden="" /></form>
                    </figure>
                </div>
            </div>
        `);
    });

    test('can upload an image', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/assets/large.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.accept([filePath]);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card="image">
                    <figure>
                        <img src="data:image/png;base64,BASE64DATA" alt="" />
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

    test('can toggle to alt text', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/assets/large.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.accept([filePath]);

        await page.click('button[name="alt-toggle-button"]');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card="image">
                    <figure>
                        <img src="data:image/png;base64,BASE64DATA" alt="" />
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
        const filePath = path.relative(process.cwd(), __dirname + '/assets/large.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.accept([filePath]);

        await page.click('input[placeholder="Type caption for image (optional)"]');
        await page.keyboard.type('This is a caption');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card="image">
                    <figure>
                        <img src="data:image/png;base64,BASE64DATA" alt="" />
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
        const filePath = path.relative(process.cwd(), __dirname + '/assets/large.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.accept([filePath]);

        expect(await page.$('[data-kg-card-toolbar="image"]')).not.toBeNull();
    });

    test('image card toolbar has Regular button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/assets/large.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.accept([filePath]);

        expect(await page.$('[data-kg-card-toolbar="image"] button[aria-label="Regular"]')).not.toBeNull();
    });

    test('image card toolbar has Wide button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/assets/large.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.accept([filePath]);

        expect(await page.$('[data-kg-card-toolbar="image"] button[aria-label="Wide"]')).not.toBeNull();
    });

    test('image card toolbar has Full button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/assets/large.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.accept([filePath]);

        expect(await page.$('[data-kg-card-toolbar="image"] button[aria-label="Full"]')).not.toBeNull();
    });

    test('image card toolbar has Link button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/assets/large.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.accept([filePath]);

        expect(await page.$('[data-kg-card-toolbar="image"] button[aria-label="Link"]')).not.toBeNull();
    });

    test('image card toolbar has Replace button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/assets/large.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.accept([filePath]);

        expect(await page.$('[data-kg-card-toolbar="image"] button[aria-label="Replace"]')).not.toBeNull();
    });

    test('image card toolbar has Snippet button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/assets/large.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.accept([filePath]);

        expect(await page.$('[data-kg-card-toolbar="image"] button[aria-label="Snippet"]')).not.toBeNull();
    });

    test('can replace image from image toolbar button', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/assets/large.png');
        const filePath2 = path.relative(process.cwd(), __dirname + '/assets/large.jpeg');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.accept([filePath]);

        expect(await page.$('[data-kg-card-toolbar="image"]')).not.toBeNull();

        const [replacefileChooser] = await Promise.all([
            page.waitForFileChooser(),
            await page.click('[data-kg-card-toolbar="image"] button[aria-label="Replace"]')
        ]);
        await replacefileChooser.accept([filePath2]);
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card="image">
                    <figure>
                        <img src="data:image/jpeg;base64,BASE64DATA" alt="" />
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

    test('toolbar does not disappear on click', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/assets/large.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.accept([filePath]);

        await page.click('figure');

        await page.click('[data-kg-card-toolbar="image"] button[aria-label="Regular"]');

        expect(await page.$('[data-kg-card-toolbar="image"]')).not.toBeNull();
    });

    test('file input opens immediately when added via card menu', async function () {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click('[data-kg-card-menu-item="Image"]')
        ]);

        expect(fileChooser).not.toBeNull();
        await fileChooser.cancel();
    });

    test('can handle drag over', async function () {
        await focusEditor(page);
        await page.keyboard.type('image! ');
        const imageCard = await page.$('[data-kg-card="image"]');
        expect(imageCard).not.toBeNull();
        await imageCard.dragEnter(this, {dataTransfer: {
            files: []
        }});
        expect(await page.$('[data-kg-card-drag-text="true"]')).not.toBeNull();
    });
    
    test.todo('can handle drag leave');
    test.todo('can handle image drop');
});
