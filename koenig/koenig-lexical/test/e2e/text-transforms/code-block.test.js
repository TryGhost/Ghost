import {assertHTML, focusEditor, html, initialize} from '../../utils/e2e';
import {test} from '@playwright/test';

test.describe('Renders code block node', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test('renders code block node in edit mode', async function ({page}) {
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
