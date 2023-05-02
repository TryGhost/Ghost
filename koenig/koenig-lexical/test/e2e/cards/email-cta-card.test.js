import {afterAll, beforeAll, beforeEach, describe} from 'vitest';
import {assertHTML, createSnippet, focusEditor, html, initialize, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

async function insertEmailCard(page) {
    await page.keyboard.type('/cta');
    await page.waitForSelector('[data-kg-card-menu-item="Email call to action"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-kg-card="email-cta"]');
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

    describe('import JSON', async () => {
        it('can import a email CTA card node', async function () {
            await page.evaluate(() => {
                const serializedState = JSON.stringify({
                    root: {
                        children: [{
                            type: 'email-cta',
                            alignment: 'left',
                            html: '<p>Hello</p>',
                            segment: 'status:free',
                            showButton: false,
                            showDividers: false
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
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="email-cta">
                    <div>
                        <div>Free members</div>
                        <div>
                            <div data-kg="editor">
                                <div contenteditable="false" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none">
                                    <p dir="ltr"><span data-lexical-text="true">Hello</span></p>
                                </div>
                            </div>
                        </div>
                        <div></div>
                    </div>
                </div>
            </div>
            `, {ignoreInnerSVG: true, ignoreCardToolbarContents: true});
        });

        it('can import a email CTA card node with dividers', async function () {
            await page.evaluate(() => {
                const serializedState = JSON.stringify({
                    root: {
                        children: [{
                            type: 'email-cta',
                            alignment: 'left',
                            html: '<p>Hello</p>',
                            segment: 'status:free',
                            showButton: false,
                            showDividers: true
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
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="email-cta">
                    <div>
                        <div>Free members</div>
                        <hr />
                        <div>
                            <div data-kg="editor">
                                <div contenteditable="false" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none">
                                    <p dir="ltr"><span data-lexical-text="true">Hello</span></p>
                                </div>
                            </div>
                        </div>
                        <hr />
                        <div></div>
                    </div>
                </div>
            </div>
            `, {ignoreInnerSVG: true, ignoreCardToolbarContents: true});
        });

        it('can import a email CTA card node with centered content', async function () {
            await page.evaluate(() => {
                const serializedState = JSON.stringify({
                    root: {
                        children: [{
                            type: 'email-cta',
                            alignment: 'center',
                            html: '<p>Hello</p>',
                            segment: 'status:free',
                            showButton: false,
                            showDividers: false
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
                <div class="sticky top-6 mb-6"><svg></svg></div>
                <div class="relative border-transparent caret-grey-800 hover:shadow-[0_0_0_1px] hover:shadow-green hover:-mx-3 hover:px-3"
                    data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="email-cta">
                    <div class="w-full pb-6">
                        <div class="pt-1 pb-7 font-sans text-xs font-semibold uppercase leading-8 tracking-tight text-grey
                        dark:text-grey-800">Free members</div>
                        <div
                            class="koenig-lexical kg-inherit-styles w-full bg-transparent whitespace-normal font-serif text-xl text-grey-900 dark:text-grey-200 text-center">
                            <div data-kg="editor">
                                <div class="kg-prose" contenteditable="false" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none">
                                    <p dir="ltr"><span data-lexical-text="true">Hello</span></p>
                                </div>
                            </div>
                        </div>
                        <div class="absolute top-0 z-10 !m-0 h-full w-full cursor-default p-0"></div>
                    </div>
                </div>
            </div>
            `, {ignoreInnerSVG: true, ignoreCardToolbarContents: true, ignoreClasses: false});
        });

        it('can import a email CTA card node with a button', async function () {
            await page.evaluate(() => {
                const serializedState = JSON.stringify({
                    root: {
                        children: [{
                            type: 'email-cta',
                            alignment: 'left',
                            html: '<p>Hello</p>',
                            segment: 'status:free',
                            showButton: true,
                            buttonText: 'Subscribe',
                            buttonUrl: 'https://example.com',
                            showDividers: false
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
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="email-cta">
                    <div>
                        <div>Free members</div>
                        <div>
                            <div data-kg="editor">
                                <div contenteditable="false" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none">
                                    <p dir="ltr"><span data-lexical-text="true">Hello</span></p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <button type="button"><span>Subscribe</span></button>
                        </div>
                        <div></div>
                    </div>
                </div>
            </div>
            `, {ignoreInnerSVG: true, ignoreCardToolbarContents: true});
        });
    });

    describe('settings panel', async () => {
        it('renders a settings panel', async function () {
            await focusEditor(page);
            await insertEmailCard(page);

            await expect(await page.getByTestId('settings-panel')).toBeVisible();
        });

        it('allows to center content', async function () {
            await focusEditor(page);
            await insertEmailCard(page);

            // Click on center align button
            const leftAlignButton = await page.getByTestId('center-align');
            leftAlignButton.click();

            // Check that the content is centered
            const content = page.locator('[data-kg-card="email-cta"] > div > div.koenig-lexical');
            await expect(content).toHaveClass(/text-center/);
        });

        it('allows to hide/show dividers', async function () {
            await focusEditor(page);
            await insertEmailCard(page);

            // Dividers are enabled by default
            const dividersSettings = await page.getByTestId('dividers-settings');
            await expect(dividersSettings).toBeVisible();
            await expect(await page.locator('[data-testid="dividers-settings"] input').isChecked()).toBeTruthy();

            // Check that the dividers are rendered
            const topDivider = await page.getByTestId('top-divider');
            const bottomDivider = await page.getByTestId('bottom-divider');
            await expect(topDivider).toBeVisible();
            await expect(bottomDivider).toBeVisible();

            // Disable dividers
            await dividersSettings.setChecked(false);

            // Check that the dividers are now hidden
            await expect(topDivider).toBeHidden();
            await expect(bottomDivider).toBeHidden();
        });

        it('allows to show/hide a button', async function () {
            await focusEditor(page);
            await insertEmailCard(page);

            // Button is disabled by default
            const buttonSettings = await page.getByTestId('button-settings');
            await expect(buttonSettings).toBeVisible();
            await expect(await page.locator('[data-testid="button-settings"] input').isChecked()).toBeFalsy();

            // Check that the button is hidden by default
            const button = await page.getByTestId('cta-button');
            await expect(button).toBeHidden();

            // Enable button and add text / url
            await buttonSettings.check();
            await page.getByTestId('button-text').fill('Subscribe');
            await page.getByTestId('button-url').fill('https://example.com');

            // Check that the button is now visible
            await expect(button).toBeVisible();
        });
    });

    it('renders the email CTA card node with a settings panel from slash command', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        await assertHTML(page, html`
        <div data-lexical-decorator="true" contenteditable="false">
            <div><svg></svg></div>
            <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="email-cta">
                <div>
                    <div>Free members</div>
                    <hr />
                    <div>
                        <div data-kg="editor">
                            <div contenteditable="true" spellcheck="true" data-lexical-editor="true" role="textbox">
                                <p><br /></p>
                            </div>
                        </div>
                        <div>Email only text... (optional)</div>
                    </div>
                    <hr />
                </div>
                <div>
                    <div draggable="true">
                        <div>
                            <div>Visibility</div>
                            <div>
                                <button type="button">Free members<svg></svg>
                                </button>
                            </div>
                            <p>Visible for this audience when delivered by email. This card is not published on your site.</p>
                        </div>
                        <hr>
                        <div>
                            <div>Content alignment</div>
                            <div>
                                <div>
                                    <ul>
                                        <li><button aria-label="Left" type="button"><svg></svg></button></li>
                                        <li><button aria-label="Center" type="button"><svg></svg></button></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div>
                                <div>Separators</div>
                            </div>
                            <div>
                                <label id="dividers-settings">
                                  <input type="checkbox" checked="" />
                                  <div></div>
                                </label>
                            </div>
                        </div>
                        <hr>
                        <div>
                            <div>
                                <div>Button</div>
                            </div>
                            <div>
                                <label id="button-settings">
                                  <input type="checkbox" />
                                  <div></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <p><br /></p>
        `, {ignoreInnerSVG: true, ignoreCardToolbarContents: true});
    });

    it('renders in display mode when unfocused', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        // Fill the card with some content, so that it's not deleted when we shift focus away
        await page.keyboard.type('Hello World');

        // Shift focus away from email card
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');

        const emailCard = page.locator('[data-kg-card="email-cta"]');
        await expect(emailCard).toHaveAttribute('data-kg-card-editing', 'false');
    });

    it('renders an action toolbar', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        // Fill the card with some content, so that it's not deleted when we shift focus away
        await page.keyboard.type('Hello World');

        // Shift focus away from email card
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');

        // Shift focus back to email card
        await page.keyboard.press('ArrowUp');

        const editButton = page.locator('[data-kg-card-toolbar="email-cta"]');
        await expect(editButton).toBeVisible();
    });

    it('is removed when left empty', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        // Shift focus away from email card
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');

        const emailCard = page.locator('[data-kg-card="email-cta"]');
        await expect(emailCard).not.toBeVisible();
    });

    it('it can contain lists', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        // Create a list
        await page.keyboard.type('- List item 1');

        const emailCard = page.locator('[data-kg-card="email-cta"] > div > div.koenig-lexical > div > div > ul > li:first-child');
        await expect(emailCard).toHaveText('List item 1');
    });

    it('can add snippet', async function () {
        await focusEditor(page);
        await insertEmailCard(page);

        // Fill the card with some content, so that it's not deleted when we shift focus away
        await page.keyboard.type('Hello World');

        // create snippet
        await page.keyboard.press('Escape');
        await createSnippet(page);

        // can insert card from snippet
        await page.keyboard.press('Enter');
        await page.keyboard.type('/snippet');
        await page.waitForSelector('[data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await expect(await page.locator('[data-kg-card="email-cta"]')).toHaveCount(2);
    });
});
