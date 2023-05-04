import {assertHTML, createSnippet, focusEditor, html, initialize} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

async function insertEmailCard(page) {
    await page.keyboard.type('/email content');
    await page.waitForSelector('[data-kg-card-menu-item="Email content"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-kg-card="email"]');
}

test.describe('Email card', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test('can import serialized email card nodes', async function ({page}) {
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
            <div><svg></svg></div>
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
                    <div></div>
                </div>
            </div>
        </div>
        `, {ignoreInnerSVG: true, ignoreCardToolbarContents: true});
    });

    test('renders email card node in edit mode from slash command', async function ({page}) {
        await focusEditor(page);
        await insertEmailCard(page);

        await assertHTML(page, html`
        <div data-lexical-decorator="true" contenteditable="false">
            <div><svg></svg></div>
            <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="email">
                <div>
                    <div>
                        <div data-kg="editor">
                            <div contenteditable="true" spellcheck="true" data-lexical-editor="true" role="textbox">
                                <p dir="ltr">
                                  <span data-lexical-text="true">Hey</span>
                                  <code data-lexical-text="true">
                                    <span>{first_name, "there"}</span>
                                  </code>
                                    <span data-lexical-text="true">,</span>
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

    test('contains `Hey {first_name, "there"}` by default when rendered', async function ({page}) {
        await focusEditor(page);
        await insertEmailCard(page);

        const htmlContent = page.locator('.kg-email-html');
        await expect(htmlContent).toContainText('Hey {first_name, "there"},');
    });

    test('renders in display mode when unfocused', async function ({page}) {
        await focusEditor(page);
        await insertEmailCard(page);

        // Shift focus away from email card
        await page.keyboard.press('ArrowDown');

        const emailCard = page.locator('[data-kg-card="email"]');
        await expect(emailCard).toHaveAttribute('data-kg-card-editing', 'false');
    });

    test('renders an action toolbar', async function ({page}) {
        await focusEditor(page);
        await insertEmailCard(page);

        // Shift focus away from email card
        await page.keyboard.press('Escape');

        const editButton = page.locator('[data-kg-card-toolbar="email"]');
        await expect(editButton).toBeVisible();
    });

    test('is removed when left empty', async function ({page}) {
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

    test('it can contain lists', async function ({page}) {
        await focusEditor(page);
        await insertEmailCard(page);

        // Create a list
        await page.keyboard.press('Enter');
        await page.keyboard.type('- List item 1');
        await page.keyboard.press('Enter');

        const emailCard = page.locator('[data-kg-card="email"] ul > li:first-child');
        await expect(emailCard).toHaveText('List item 1');
    });

    test('can add snippet', async function ({page}) {
        await focusEditor(page);
        await insertEmailCard(page);

        // create snippet
        await page.keyboard.press('Escape');
        await createSnippet(page);

        // can insert card from snippet
        await page.keyboard.press('Enter');
        await page.keyboard.type('/snippet');
        await page.waitForSelector('[data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await expect(await page.locator('[data-kg-card="email"]')).toHaveCount(2);
    });
});
