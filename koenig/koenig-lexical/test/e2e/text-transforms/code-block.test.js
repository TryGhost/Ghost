import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {start, initialize, focusEditor, assertHTML, html} from '../../utils/e2e';

describe('Renders code block node', async () => {
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

    test('renders code block node', async function () {
        await focusEditor(page);
        await page.keyboard.type('```javascript ');
        await assertHTML(page, html`
        <div data-lexical-decorator="true" contenteditable="false"><div class="caret-grey-800 hover:shadow-green relative hover:shadow-[0_0_0_1px]" data-kg-card="true"><code><textarea autocorrect="off" autocapitalize="off" spellcheck="false" tabindex="0" class="bg-grey-50 min-h-170 w-full p-3" style="height: 52px;">javascript</textarea></code></div></div>`);
    });
});
