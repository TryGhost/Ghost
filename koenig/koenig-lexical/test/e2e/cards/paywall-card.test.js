import {afterAll, beforeAll, beforeEach, describe} from 'vitest';
import {assertHTML, focusEditor, html, initialize, startApp} from '../../utils/e2e';

async function insertPaywallCard(page) {
    await page.keyboard.type('/paywall');
    await page.waitForSelector('[data-kg-card-menu-item="Public preview"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
}

describe('Paywall card', async () => {
    let app;
    let page;

    beforeAll(async () => {
        ({app, page} = await startApp());
    });

    afterAll(async () => {
        await app.stop();
    });

    beforeEach(async () => {
        await initialize({page});
    });

    it('can import serialized paywall card nodes', async function () {
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

    it('renders paywall card node from slash command', async function () {
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

    it('focuses on the next paragraph when rendered', async function () {
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