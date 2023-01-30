import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {startApp, initialize, focusEditor, assertHTML, html} from '../../utils/e2e';

describe('Markdown card', async () => {
    let app;
    let page;

    // issue https://github.com/microsoft/playwright/issues/12168
    const ctrlOrCmd = process.platform === 'darwin' ? 'Meta' : 'Control';

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
                <div><svg></svg></div>
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="markdown">
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
                <div><svg></svg></div>
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="markdown">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});

        await page.locator('.CodeMirror-line').dblclick();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div><svg></svg></div>
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="markdown">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('should open unsplash dialog on Cmd-Alt-U', async function () {
        await focusEditor(page);
        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await page.click('[data-kg-card="markdown"]');

        await page.keyboard.press(`${ctrlOrCmd}+Alt+U`);
        await page.waitForSelector('[data-kg-modal="unsplash"]');
    });

    test('should toggle spellcheck on Cmd-Alt-S', async function () {
        await focusEditor(page);
        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await page.click('[data-kg-card="markdown"]');

        expect(await page.$('[title*="Spellcheck"][class*="active"]')).not.toBeNull();
        await page.keyboard.press(`${ctrlOrCmd}+Alt+S`);
        expect(await page.$('[title*="Spellcheck"]')).not.toBeNull();
        expect(await page.$('[title*="Spellcheck"][class*="active"]')).toBeNull();
    });

    test('should open image upload dialog on Cmd-Alt-I', async function () {
        const fileChooserPromise = page.waitForEvent('filechooser');
        await focusEditor(page);
        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.press(`${ctrlOrCmd}+Alt+I`);
        await fileChooserPromise;
    });
});
