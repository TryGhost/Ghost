import {assertHTML, focusEditor, html, initialize} from '../../utils/e2e';
import {test} from '@playwright/test';

test.describe('Renders horizontal line rule', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test('renders horizontal line rule', async function ({page}) {
        await focusEditor(page);
        await page.keyboard.type('--- ');
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
