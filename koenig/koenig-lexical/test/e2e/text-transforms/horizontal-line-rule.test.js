import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {start, initialize, focusEditor, assertHTML, html} from '../../utils/e2e';

describe('Renders horizontal line rule', async () => {
    let app;
    let page;

    beforeAll(async () => {
        ({app, page} = await start());
    });

    afterAll(async () => {
        await app.stop();
    });

    beforeEach(async () => {
        await initialize({page});
    });

    test('renders horizontal line rule', async function () {
        await focusEditor(page);
        await page.keyboard.type('--- ');
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card="true">
                    <hr>
                </div>
            </div>
            <p><br></p>
        `);
    });
});
