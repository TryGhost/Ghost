import {assertHTML, focusEditor, html, initialize} from '../../utils/e2e';
import {test} from '@playwright/test';

async function createSignupCard({page}) {
    await focusEditor(page);
    await page.keyboard.type('/signup');
    await page.waitForSelector('[data-kg-card-menu-item="Signup"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-kg-card="signup"]');
}

test.describe('Signup card', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test('renders signup card node', async function ({page}) {
        await createSignupCard({page});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="signup">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });
});
