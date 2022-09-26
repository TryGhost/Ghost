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
        <div data-lexical-decorator="true" contenteditable="false" style="display: contents;"><div class="caret-grey-800 hover:shadow-green relative hover:shadow-[0_0_0_1px]" data-kg-card="true"><hr></div></div><p><br></p>
        `); // TODO: Lexical appends a <br> to the end of this element, which is not ideal. It might be an upstream bug https://github.com/facebook/lexical/discussions/3021
    });
});
