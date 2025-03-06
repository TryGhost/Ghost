import {assertHTML, focusEditor, html, initialize, test} from '../../utils/e2e';

test.describe('Renders paywall card', async () => {
    let page;

    test.beforeAll(async ({sharedPage}) => {
        page = sharedPage;
    });

    test.beforeEach(async () => {
        await initialize({page});
    });

    test('renders paywall card', async function () {
        await focusEditor(page);
        await page.keyboard.type('===');
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="paywall">
                    <div>
                        Free public preview
                        <span>↑</span>
                        /
                        <span>↓</span>
                        Only visible to members
                    </div>
                </div>
            </div>
            <p><br></p>
        `);
    });
});
