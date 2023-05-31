import {assertHTML, focusEditor, html, initialize, resetEditor} from '../../utils/e2e';
import {test} from '@playwright/test';

test.describe('Renders code block node', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
        await initialize({page});
    });

    test.beforeEach(async () => {
        await resetEditor({page});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('renders code block node in edit mode', async function () {
        await focusEditor(page);
        await page.keyboard.type('```javascript ');
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="codeblock">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });
});
