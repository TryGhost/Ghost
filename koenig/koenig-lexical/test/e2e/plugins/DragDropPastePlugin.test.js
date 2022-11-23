import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {startApp, initialize, focusEditor, assertHTML, html} from '../../utils/e2e';
import path from 'path';
import fs from 'fs';

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
        const buffer = fs.readFileSync(filePath);

        const dataTransfer = await page.evaluateHandle((data) => {
            const dt = new DataTransfer();
            const file = new File([data.toString('hex')], 'large-image.png', {type: 'image/png'});
            dt.items.add(file);
            return dt;
        }, buffer);

        await page.dispatchEvent(
            '#root',
            'dragenter',
            {dataTransfer}
        );
        await page.dispatchEvent(
            '#root',
            'drop',
            {dataTransfer}
        );

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img
                                src="blob:..."
                                alt="upload in progress, 0 " />
                        </div>
                        <figcaption>
                            <input placeholder="Type caption for image (optional)" value="" />
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                </div>
            </div>
            <p><br /></p>
        `);
    });
});
