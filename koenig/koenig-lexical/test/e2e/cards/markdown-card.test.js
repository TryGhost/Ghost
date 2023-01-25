import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {startApp, initialize, focusEditor, assertHTML, html} from '../../utils/e2e';

describe('Markdown card', async () => {
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

    test('renders markdown card node', async function () {
        await focusEditor(page);
        await page.keyboard.type('/');

        await page.click('[data-kg-card-menu-item="Markdown"]');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="markdown">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test ('markdown card doesn\'t leave editing mode on double click inside', async function () {
        await focusEditor(page);
        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');

        await page.click('[data-kg-card="markdown"]');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="markdown">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});

        await page.locator('.CodeMirror-line').dblclick();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="markdown">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });
});
