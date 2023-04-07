import {afterAll, beforeAll, beforeEach, describe} from 'vitest';
import {assertHTML, focusEditor, html, initialize, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

async function insertEmailCard(page) {
    await page.keyboard.type('/email content');
    await page.waitForSelector('[data-kg-card-menu-item="Email content"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-kg-card="email"]');
}

describe('Email card', async () => {
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

    it('can import serialized email card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'email',
                        html: '<p>A paragraph</p>'
                    }],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });
            const editor = window.lexicalEditor;
            const editorState = editor.parseEditorState(serializedState);
            editor.setEditorState(editorState);
        });

        await assertHTML(page, html`
        <div data-lexical-decorator="true" contenteditable="false">
            <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="email">
                <div>
                    <div>
                        <div data-kg="editor">
                            <div contenteditable="false" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none">
                                <p dir="ltr">
                                    <span data-lexical-text="true">A paragraph</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `, {ignoreInnerSVG: true, ignoreCardToolbarContents: true});
    });

    it('renders email card node in edit mode from slash command', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        await assertHTML(page, html`
        <div data-lexical-decorator="true" contenteditable="false">
            <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="email">
                <div>
                    <div>
                        <div data-kg="editor">
                            <div contenteditable="true" spellcheck="true" data-lexical-editor="true" role="textbox">
                                <p dir="ltr">
                                  <span data-lexical-text="true">Hey</span>
                                  <code data-lexical-text="true">
                                    <span>{first_name, "there"},</span>
                                  </code>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div> 
                        Only visible when delivered by email, this card will not be published on your site.
                        <a href="https://ghost.org/help/email-newsletters/#email-cards" rel="noopener noreferrer" target="_blank">
                            <svg></svg>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        <p><br /></p>
        `, {ignoreInnerSVG: true, ignoreCardToolbarContents: true});
    });

    it('contains `Hey {first_name, "there"}` by default when rendered', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        const htmlContent = page.locator('.kg-email-html');
        await expect(htmlContent).toContainText('Hey {first_name, "there"},');
    });

    it('renders in display mode when unfocused', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        // Shift focus away from email card
        await page.keyboard.press('ArrowDown');

        const emailCard = page.locator('[data-kg-card="email"]');
        await expect(emailCard).toHaveAttribute('data-kg-card-editing', 'false');
    });

    it('renders an action toolbar', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        // Shift focus away from email card
        await page.keyboard.press('ArrowDown');

        // Shift focus back to email card
        await page.keyboard.press('ArrowUp');

        const editButton = page.locator('[data-kg-card-toolbar="email"]');
        await expect(editButton).toBeVisible();
    });

    it('is removed when left empty', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        // Remove all existing content
        for (let i = 0; i < 'Hey {first_name, "there"},'.length; i++) {
            await page.keyboard.press('Backspace');
        }

        // Shift focus away from email card
        await page.keyboard.press('ArrowDown');

        const emailCard = page.locator('[data-kg-card="email"]');
        await expect(emailCard).not.toBeVisible();
    });

    it('it can contain lists', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        // Create a list
        await page.keyboard.press('Enter');
        await page.keyboard.type('- List item 1');
        await page.keyboard.press('Enter');

        const emailCard = page.locator('[data-kg-card="email"] ul > li:first-child');
        await expect(emailCard).toHaveText('List item 1');
    });
});
