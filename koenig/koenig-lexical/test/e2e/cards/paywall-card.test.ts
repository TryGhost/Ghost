import {assertHTML, focusEditor, html, initialize} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

async function insertPaywallCard(page) {
    await page.keyboard.type('/paywall');
    await page.waitForSelector('[data-kg-card-menu-item="Public preview"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
}

test.describe('Paywall card', async () => {
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

    test('can import serialized paywall card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'paywall'
                    }],
                    type: 'root',
                    version: 1
                }
            });
            const editor = window.lexicalEditor;
            const editorState = editor.parseEditorState(serializedState);
            editor.setEditorState(editorState);
        });

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-koenig-dnd-draggable="true" data-koenig-dnd-droppable="true">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="paywall">
                    <div data-post-access="members">
                        Free public preview<span>↑</span>/<span>↓</span>Members only
                    </div>
                </div>
            </div>
        `);
    });

    test('renders paywall card node from slash command', async function () {
        await focusEditor(page);
        await insertPaywallCard(page);

        await expect(page.locator('[data-kg-card="paywall"]')).toHaveAttribute('data-kg-card-selected', 'true');
        await expect(page.locator('[data-kg-card="paywall"]')).toHaveAttribute('data-kg-card-editing', 'true');
        await expect(page.getByTestId('settings-panel')).toBeVisible();
        await expect(page.getByTestId('paywall-post-access-value')).toBeVisible();
    });

});
