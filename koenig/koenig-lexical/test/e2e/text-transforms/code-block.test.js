import {assertHTML, focusEditor, html, initialize, test} from '../../utils/e2e';

test.describe('Renders code block node', async () => {
    let page;

    test.beforeAll(async ({sharedPage}) => {
        page = sharedPage;
    });

    test.beforeEach(async () => {
        await initialize({page});
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
