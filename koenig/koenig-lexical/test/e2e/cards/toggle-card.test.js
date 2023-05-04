import {assertHTML, createSnippet, focusEditor, html, initialize} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

async function insertToggleCard(page) {
    await page.keyboard.type('/toggle');
    await page.waitForSelector('[data-kg-card-menu-item="Toggle"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-kg-card="toggle"]');
}

test.describe('Toggle card', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test('can import serialized toggle card nodes', async function ({page}) {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'toggle',
                        header: '<span><em>Header</em></span>', // header shouldn't have wrapper element like <p> or <h4>
                        content: '<p dir="ltr"><span>Content</span></p>'
                    }],
                    direction: null,
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
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="toggle">
                        <div class="rounded border border-grey/40 py-4 px-6 dark:border-grey/30">
                            <div class="flex cursor-text items-start justify-between">
                                <div class="mr-2 w-full">
                                    <div class="koenig-lexical-toggle-header">
                                        <div data-kg="editor">
                                            <div
                                                contenteditable="false"
                                                spellcheck="true"
                                                data-lexical-editor="true"
                                                aria-autocomplete="none"
                                            >
                                                <p dir="ltr"><em data-lexical-text="true">Header</em></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    class="ml-auto mt-[-1px] flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center">
                                    <svg></svg>
                                </div>
                            </div>
                            <div class="mt-2 w-full visible">
                                <div class="koenig-lexical-toggle-description">
                                    <div data-kg="editor">
                                        <div
                                            contenteditable="false"
                                            spellcheck="true"
                                            data-lexical-editor="true"
                                            aria-autocomplete="none"
                                        >
                                            <p dir="ltr"><span data-lexical-text="true">Content</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div></div>
                    </div>
                </div>
            `, {ignoreCardToolbarContents: true, ignoreInnerSVG: true});
    });

    test('renders toggle card node from slash command', async function ({page}) {
        await focusEditor(page);
        await insertToggleCard(page);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="toggle">
                    <div class="rounded border border-grey/40 py-4 px-6 dark:border-grey/30">
                        <div class="flex cursor-text items-start justify-between">
                            <div class="mr-2 w-full">
                                <div class="koenig-lexical-toggle-header">
                                    <div data-kg="editor">
                                        <div
                                            contenteditable="true"
                                            spellcheck="true"
                                            data-lexical-editor="true"
                                            role="textbox"
                                        >
                                            <p><br /></p>
                                        </div>
                                    </div>
                                    <div>Toggle header</div>
                                </div>
                            </div>
                            <div
                                class="ml-auto mt-[-1px] flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center">
                                <svg></svg>
                            </div>
                        </div>
                        <div class="mt-2 w-full visible">
                            <div class="koenig-lexical-toggle-description">
                                <div data-kg="editor">
                                    <div
                                        contenteditable="true"
                                        spellcheck="true"
                                        data-lexical-editor="true"
                                        role="textbox"
                                    >
                                        <p><br /></p>
                                    </div>
                                </div>
                                <div>Collapsible content</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreInnerSVG: true});
    });

    test('focuses on the header input when rendered', async function ({page}) {
        await focusEditor(page);
        await insertToggleCard(page);

        await page.keyboard.type('Header');

        const header = page.locator('.koenig-lexical-toggle-header');
        await expect(header).toContainText('Header');
    });

    test('focuses on the content input when "Enter" is pressed from the header input', async function ({page}) {
        await focusEditor(page);
        await insertToggleCard(page);

        await page.keyboard.press('Enter');
        await page.keyboard.type('Content');

        const content = page.locator('.koenig-lexical-toggle-description');
        await expect(content).toContainText('Content');
    });

    test('focuses on the content input when "Tab" is pressed from the header input', async function ({page}) {
        await focusEditor(page);
        await insertToggleCard(page);

        await page.keyboard.press('Tab');
        await page.keyboard.type('Content');

        const content = page.locator('.koenig-lexical-toggle-description');
        await expect(content).toContainText('Content');
    });

    test('focuses on the content input when "Arrow Down" is pressed from the header input', async function ({page}) {
        await focusEditor(page);
        await insertToggleCard(page);

        await page.keyboard.press('ArrowDown');
        await page.keyboard.type('Content');

        const content = page.locator('.koenig-lexical-toggle-description');
        await expect(content).toContainText('Content');
    });

    test('focuses on the header input when "Arrow Up" is pressed from the content input', async function ({page}) {
        await focusEditor(page);
        await insertToggleCard(page);

        await page.keyboard.press('ArrowDown');
        await page.keyboard.type('Content');
        await page.keyboard.press('ArrowUp');
        await page.keyboard.type('Header');

        const header = page.locator('.koenig-lexical-toggle-header');
        await expect(header).toContainText('Header');
    });

    test('renders in display mode when unfocused', async function ({page}) {
        await focusEditor(page);
        await insertToggleCard(page);

        // add some content to avoid auto-removal when leaving empty
        await page.keyboard.type('Header');

        // Shift focus away from header field
        await page.keyboard.press('ArrowDown');

        // Shift focus away from content field
        await page.keyboard.press('ArrowDown');

        const toggleCard = page.locator('[data-kg-card="toggle"]');
        await expect(toggleCard).toHaveAttribute('data-kg-card-editing', 'false');
    });

    test('renders an action toolbar', async function ({page}) {
        await focusEditor(page);
        await insertToggleCard(page);

        // Add some content to avoid auto-removal
        await page.keyboard.type('Header');

        // Shift focus away from toggle card
        await page.keyboard.press('Escape');

        const editButton = page.locator('[data-kg-card-toolbar="toggle"]');
        await expect(editButton).toBeVisible();
    });

    test('is removed when left empty', async function ({page}) {
        await focusEditor(page);
        await insertToggleCard(page);

        // Shift focus away from header field
        await page.keyboard.press('ArrowDown');

        // Shift focus away from content field
        await page.keyboard.press('ArrowDown');

        const toggleCard = page.locator('[data-kg-card="toggle"]');
        await expect(toggleCard).not.toBeVisible();
    });

    test('can add snippet', async function ({page}) {
        await focusEditor(page);
        await insertToggleCard(page);

        // Add some content to avoid auto-removal
        await page.keyboard.type('Header');

        // create snippet
        await page.keyboard.press('Escape');
        await createSnippet(page);

        // can insert card from snippet
        await page.keyboard.press('Enter');
        await page.keyboard.type('/snippet');
        await page.waitForSelector('[data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await expect(await page.locator('[data-kg-card="toggle"]')).toHaveCount(2);
    });
});
