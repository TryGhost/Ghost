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
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card="true">
                    <code>
                        <textarea autocorrect="off" autocapitalize="off" spellcheck="false" tabindex="0">javascript</textarea>
                    </code>
                </div>
            </div>
        `);
    });
});
