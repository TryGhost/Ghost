import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, startApp, initialize, focusEditor, html} from '../../utils/e2e';

describe('Renders code block node', async () => {
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

    test('renders code block node', async function () {
        await focusEditor(page);
        await page.keyboard.type('```javascript ');
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="codeblock">
                </div>
            </div>
            <div contenteditable="false" data-lexical-cursor="true"></div>
        `, {ignoreCardContents: true});
    });
});
