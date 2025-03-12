import {assertHTML, focusEditor, html, initialize} from '../../utils/e2e';
import {test} from '@playwright/test';

test.describe('Renders paywall card', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page});
    });

    test.afterAll(async () => {
        await page.close();
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
