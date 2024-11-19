import {assertHTML, createSnippet, focusEditor, html, initialize, isMac} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

async function insertEmailCard(page) {
    await page.keyboard.type('/email content');
    await page.waitForSelector('[data-kg-card-menu-item="Email content"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-kg-card="email"]');
}

test.describe('Email card', async () => {
    const ctrlOrCmd = isMac() ? 'Meta' : 'Control';
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

    test('can import serialized email card nodes', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
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
        }));

        await initialize({page, uri: `/#/?content=${contentParam}`});

        await assertHTML(page, html`
        <div data-lexical-decorator="true" contenteditable="false">
            <div><svg></svg></div>
            <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="email">
                <div>Hidden on website</div>
                <div>
                    <div>
                        <div data-kg="editor">
                            <div contenteditable="false" role="textbox" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none" aria-readonly="true">
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

    test('renders email card node in edit mode from slash command', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        await assertHTML(page, html`
        <div data-lexical-decorator="true" contenteditable="false">
            <div><svg></svg></div>
            <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="email">
                <div>Hidden on website</div>
                <div>
                    <div>
                        <div data-kg="editor">
                            <div contenteditable="true" role="textbox" spellcheck="true" data-lexical-editor="true">
                                <p dir="ltr">
                                  <span data-lexical-text="true">Hey</span>
                                  <code spellcheck="false" data-lexical-text="true">
                                    <span>{first_name, "there"}</span>
                                  </code>
                                    <span data-lexical-text="true">,</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <p><br /></p>
        `, {ignoreInnerSVG: true, ignoreCardToolbarContents: true});
    });

    test('contains `Hey {first_name, "there"}` by default when rendered', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        const htmlContent = page.locator('.kg-email-html');
        await expect(htmlContent).toContainText('Hey {first_name, "there"},');
    });

    test('renders in display mode when unfocused', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        // Shift focus away from email card
        await page.keyboard.press('ArrowDown');

        const emailCard = page.locator('[data-kg-card="email"]');
        await expect(emailCard).toHaveAttribute('data-kg-card-editing', 'false');
    });

    test('renders an action toolbar', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        // Shift focus away from email card
        await page.keyboard.press('Escape');

        const editButton = page.locator('[data-kg-card-toolbar="email"]');
        await expect(editButton).toBeVisible();
    });

    test('is removed when left empty', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        // Remove all existing content
        await page.keyboard.press(`${ctrlOrCmd}+A`);
        await page.keyboard.press('Backspace');

        // Shift focus away from email card
        await page.keyboard.press('ArrowDown');

        const emailCard = page.locator('[data-kg-card="email"]');
        await expect(emailCard).not.toBeVisible();
    });

    test('it can contain lists', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        // Create a list
        await page.keyboard.press('Enter');
        await page.keyboard.type('- List item 1');
        await page.keyboard.press('Enter');

        const emailCard = page.locator('[data-kg-card="email"] ul > li:first-child');
        await expect(emailCard).toHaveText('List item 1');
    });

    test('can add snippet', async function () {
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

    test('can undo/redo without losing html content', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        await page.keyboard.press('Enter');
        await page.keyboard.type('- List item 1');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Escape');
        await page.keyboard.press('Backspace');
        await page.keyboard.press(`${ctrlOrCmd}+z`);

        const emailCard = page.locator('[data-kg-card="email"] ul > li:first-child');
        await expect(emailCard).toHaveText('List item 1');
    });

    // placeholders like {test} or {test, "string"} should be formatted as code
    test('formats typed placeholders', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        await page.keyboard.press(`Enter`);
        await page.keyboard.type(`testing {this}?`);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div><svg></svg></div>
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="email">
                    <div>Hidden on website</div>
                    <div>
                        <div>
                            <div data-kg="editor">
                                <div contenteditable="true" role="textbox" spellcheck="true" data-lexical-editor="true">
                                    <p dir="ltr">
                                        <span data-lexical-text="true">Hey</span>
                                        <code spellcheck="false" data-lexical-text="true">
                                        <span>{first_name, "there"}</span>
                                        </code>
                                        <span data-lexical-text="true">,</span>
                                    </p>
                                    <p dir="ltr">
                                        <span data-lexical-text="true">testing </span>
                                        <code spellcheck="false" data-lexical-text="true">
                                            <span>{this}</span>
                                        </code>
                                        <span data-lexical-text="true">?</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <p><br /></p>
    `, {ignoreInnerSVG: true, ignoreCardToolbarContents: true});

        // remove the formatting using backspace
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div><svg></svg></div>
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="email">
                    <div>Hidden on website</div>
                    <div>
                        <div>
                            <div data-kg="editor">
                                <div contenteditable="true" role="textbox" spellcheck="true" data-lexical-editor="true">
                                    <p dir="ltr">
                                        <span data-lexical-text="true">Hey</span>
                                        <code spellcheck="false" data-lexical-text="true">
                                        <span>{first_name, "there"}</span>
                                        </code>
                                        <span data-lexical-text="true">,</span>
                                    </p>
                                    <p dir="ltr">
                                        <span data-lexical-text="true">testing {this</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <p><br /></p>
    `, {ignoreInnerSVG: true, ignoreCardToolbarContents: true});
    });
});
