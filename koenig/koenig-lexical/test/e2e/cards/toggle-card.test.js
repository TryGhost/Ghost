import {afterAll, beforeAll, beforeEach, describe} from 'vitest';
import {assertHTML, focusEditor, html, initialize, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

async function insertToggleCard(page) {
    await page.keyboard.type('/toggle');
    await page.waitForSelector('[data-kg-card-menu-item="Toggle"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-kg-card="toggle"]');
}

describe('Toggle card', async () => {
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

    it('can import serialized toggle card nodes', async function () {
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
                                    <div class="kg-toggle-header-text">
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
                                <div class="kg-toggle-content-text">
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

    it('renders toggle card node from slash command', async function () {
        await focusEditor(page);
        await insertToggleCard(page);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="toggle">
                    <div class="rounded border border-grey/40 py-4 px-6 dark:border-grey/30">
                        <div class="flex cursor-text items-start justify-between">
                            <div class="mr-2 w-full">
                                <div class="kg-toggle-header-text">
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
                            <div class="kg-toggle-content-text">
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

    it('focuses on the header input when rendered', async function () {
        await focusEditor(page);
        await insertToggleCard(page);

        await page.keyboard.type('Header');

        const header = page.locator('.kg-toggle-header-text');
        await expect(header).toContainText('Header');
    });

    it('focuses on the content input when "Enter" is pressed from the header input', async function () {
        await focusEditor(page);
        await insertToggleCard(page);

        await page.keyboard.press('Enter');
        await page.keyboard.type('Content');

        const content = page.locator('.kg-toggle-content-text');
        await expect(content).toContainText('Content');
    });

    it('focuses on the content input when "Tab" is pressed from the header input', async function () {
        await focusEditor(page);
        await insertToggleCard(page);

        await page.keyboard.press('Tab');
        await page.keyboard.type('Content');

        const content = page.locator('.kg-toggle-content-text');
        await expect(content).toContainText('Content');
    });

    it('focuses on the content input when "Arrow Down" is pressed from the header input', async function () {
        await focusEditor(page);
        await insertToggleCard(page);

        await page.keyboard.press('ArrowDown');
        await page.keyboard.type('Content');

        const content = page.locator('.kg-toggle-content-text');
        await expect(content).toContainText('Content');
    });

    it('focuses on the header input when "Arrow Up" is pressed from the content input', async function () {
        await focusEditor(page);
        await insertToggleCard(page);

        await page.keyboard.press('ArrowUp');
        await page.keyboard.type('Header');

        const header = page.locator('.kg-toggle-header-text');
        await expect(header).toContainText('Header');
    });

    it('renders in display mode when unfocused', async function () {
        await focusEditor(page);
        await insertToggleCard(page);

        // add some content to avoid auto-removal when leaving empty
        await page.keyboard.type('Header');

        // Shift focus from header to content
        await page.keyboard.press('ArrowDown');

        // Shift focus from content to editor
        await page.keyboard.press('ArrowDown');

        const toggleCard = page.locator('[data-kg-card="toggle"]');
        await expect(toggleCard).toHaveAttribute('data-kg-card-editing', 'false');
    });

    it('renders an action toolbar', async function () {
        await focusEditor(page);
        await insertToggleCard(page);

        // Add some content to avoid auto-removal
        await page.keyboard.type('Header');

        // Shift focus from header to content
        await page.keyboard.press('ArrowDown');

        // Shift focus from content to editor
        await page.keyboard.press('ArrowDown');

        // Shift focus back to toggle card
        await page.keyboard.press('ArrowUp');

        const editButton = page.locator('[data-kg-card-toolbar="toggle"]');
        await expect(editButton).toBeVisible();
    });

    it('is removed when left empty', async function () {
        await focusEditor(page);
        await insertToggleCard(page);

        // Shift focus from header to content
        await page.keyboard.press('ArrowDown');

        // Shift focus from content to editor
        await page.keyboard.press('ArrowDown');

        const toggleCard = page.locator('[data-kg-card="toggle"]');
        await expect(toggleCard).not.toBeVisible();
    });
});
