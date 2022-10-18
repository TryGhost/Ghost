import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
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
                        <img src="data:image/png;" alt="" />
                        <figcaption>
                            <input placeholder="Type caption for image (optional)" value="" />
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                </div>
            </div>
        `);
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
                        <img src="data:image/png;" alt="" />
                        <figcaption>
                            <input placeholder="Type alt text for image (optional)" value=""/>
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                </div>
            </div>
        `);
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
                        <img src="data:image/png;" alt="" />
                        <figcaption>
                            <input placeholder="Type caption for image (optional)" value="This is a caption" />
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                </div>
            </div>
        `);
    });
});
