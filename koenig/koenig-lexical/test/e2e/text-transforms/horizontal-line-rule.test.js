import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {startApp, initialize, focusEditor, assertHTML, html} from '../../utils/e2e';

describe('Renders horizontal line rule', async () => {
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

    test('renders horizontal line rule', async function () {
        await focusEditor(page);
        await page.keyboard.type('--- ');
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
            </div>
            <p><br></p>
        `);
    });
});
