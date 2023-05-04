import {assertHTML, focusEditor, html, initialize} from '../../utils/e2e';
import {test} from '@playwright/test';

async function insertPaywallCard(page) {
    await page.keyboard.type('/paywall');
    await page.waitForSelector('[data-kg-card-menu-item="Public preview"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
}

test.describe('Paywall card', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test('can import serialized paywall card nodes', async function ({page}) {
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
                    <div>
                        Free public preview<span>↑</span>/<span>↓</span>Only visible to members
                    </div>
                </div>
            </div>
        `);
    });

    test('renders paywall card node from slash command', async function ({page}) {
        await focusEditor(page);
        await insertPaywallCard(page);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-koenig-dnd-draggable="true" data-koenig-dnd-droppable="true">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="paywall">
                    <div>
                        Free public preview<span>↑</span>/<span>↓</span>Only visible to members
                    </div>
                </div>
            </div>
            <p><br /></p>
        `);
    });

    test('focuses on the next paragraph when rendered', async function ({page}) {
        await focusEditor(page);
        await insertPaywallCard(page);

        await page.keyboard.type('Next paragraph');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-koenig-dnd-draggable="true" data-koenig-dnd-droppable="true">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="paywall">
                </div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">Next paragraph</span></p>
        `, {ignoreCardContents: true});
    });
});
