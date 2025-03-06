import {assertHTML, focusEditor, html, initialize, test} from '../../utils/e2e';

test.describe('Renders horizontal line rule', async () => {
    let page;

    test.beforeAll(async ({sharedPage}) => {
        page = sharedPage;
    });

    test.beforeEach(async () => {
        await initialize({page});
    });

    test('renders horizontal line rule', async function () {
        await focusEditor(page);
        await page.keyboard.type('---');
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                    <hr>
                </div>
            </div>
            <p><br></p>
        `);
    });
});
