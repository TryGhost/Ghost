import {assertHTML, focusEditor, html, initialize} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Koenig Editor with email template nodes', async function () {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page, uri: '/#/email?content=false'});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('Basic functionality', function () {
        test('can navigate to email editor', async function () {
            await focusEditor(page);
            await expect(page.locator('[data-kg="editor"]')).toBeVisible();
        });

        test('shows correct placeholder text', async function () {
            await expect(page.locator('text=Begin writing your email...')).toBeVisible();
        });

        test('renders EmailEditorWrapper with From and Subject fields', async function () {
            await expect(page.locator('text=From:')).toBeVisible();
            await expect(page.locator('text=Ghost <noreply@example.com>')).toBeVisible();
            await expect(page.locator('text=Subject:')).toBeVisible();
            await expect(page.locator('text=Welcome to Ghost')).toBeVisible();
        });

        test('title is hidden', async function () {
            await expect(page.locator('[data-testid="post-title"]')).toHaveCount(0);
        });
    });

    test.describe('Supported features', function () {
        test('can add basic text', async function () {
            await focusEditor(page);
            await page.keyboard.type('Hello World');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">Hello World</span></p>
            `);
        });

        test('can add multiple paragraphs', async function () {
            await focusEditor(page);
            await page.keyboard.type('First paragraph');
            await page.keyboard.press('Enter');
            await page.keyboard.type('Second paragraph');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">First paragraph</span></p>
                <p dir="ltr"><span data-lexical-text="true">Second paragraph</span></p>
            `);
        });

        test('can create headings with ## shortcut', async function () {
            await focusEditor(page);
            await page.keyboard.type('## Heading 2');

            await assertHTML(page, html`
                <h2 dir="ltr"><span data-lexical-text="true">Heading 2</span></h2>
            `);
        });

        test('can create unordered lists with - shortcut', async function () {
            await focusEditor(page);
            await page.keyboard.type('- List item');

            await assertHTML(page, html`
                <ul>
                    <li value="1" dir="ltr"><span data-lexical-text="true">List item</span></li>
                </ul>
            `);
        });

        test('can create ordered lists with 1. shortcut', async function () {
            await focusEditor(page);
            await page.keyboard.type('1. List item');

            await assertHTML(page, html`
                <ol>
                    <li value="1" dir="ltr"><span data-lexical-text="true">List item</span></li>
                </ol>
            `);
        });

        test('can create horizontal rules with --- shortcut', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr />
                    </div>
                </div>
                <p><br /></p>
            `, {ignoreCardToolbarContents: true});
        });

        test('list backspace at start converts to paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('- Item');
            // Move to start of line
            await page.keyboard.press('Home');
            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">Item</span></p>
            `);
        });

        test('can create blockquote with > shortcut', async function () {
            await focusEditor(page);
            await page.keyboard.type('> This is a quote');

            await assertHTML(page, html`
                <blockquote dir="ltr"><span data-lexical-text="true">This is a quote</span></blockquote>
            `);
        });
    });

    test.describe('Unsupported features', function () {
        test('code block shortcut does NOT create code block', async function () {
            await focusEditor(page);
            await page.keyboard.type('```javascript ');

            // Should remain as plain text, not a code block
            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">\`\`\`javascript </span></p>
            `);
        });

        test('slash menu is not available', async function () {
            await focusEditor(page);
            await expect(page.locator('[data-kg-slash-menu]')).toHaveCount(0);
            await page.keyboard.type('/');
            await expect(page.locator('[data-kg-slash-menu]')).toHaveCount(0);
        });

        test('plus button is not shown', async function () {
            await focusEditor(page);
            await expect(page.locator('[data-kg-plus-button]')).toHaveCount(0);
        });
    });

    test.describe('Floating format toolbar', function () {
        test('appears on text selection', async function () {
            await focusEditor(page);
            await page.keyboard.type('text for selection');

            await expect(page.locator('[data-kg-floating-toolbar]')).toHaveCount(0);

            // Select text
            await page.keyboard.down('Shift');
            for (let i = 0; i < 'for selection'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }
            await page.keyboard.up('Shift');

            await expect(page.locator('[data-kg-floating-toolbar]')).toBeVisible();
        });

        test('has heading buttons', async function () {
            await focusEditor(page);
            await page.keyboard.type('text for selection');

            // Select text
            await page.keyboard.down('Shift');
            for (let i = 0; i < 'for selection'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }
            await page.keyboard.up('Shift');

            await expect(page.locator('[data-kg-floating-toolbar]')).toBeVisible();

            // Email editor should have heading buttons (unlike basic/minimal)
            const h2ButtonSelector = '[data-kg-floating-toolbar] [data-kg-toolbar-button="h2"] button';
            await expect(page.locator(h2ButtonSelector)).toBeVisible();
        });

        test('has quote button', async function () {
            await focusEditor(page);
            await page.keyboard.type('text for selection');

            // Select text
            await page.keyboard.down('Shift');
            for (let i = 0; i < 'for selection'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }
            await page.keyboard.up('Shift');

            await expect(page.locator('[data-kg-floating-toolbar]')).toBeVisible();

            const quoteButtonSelector = '[data-kg-floating-toolbar] [data-kg-toolbar-button="quote"] button';
            await expect(page.locator(quoteButtonSelector)).toBeVisible();
        });

        test('has link button', async function () {
            await focusEditor(page);
            await page.keyboard.type('text for selection');

            // Select text
            await page.keyboard.down('Shift');
            for (let i = 0; i < 'for selection'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }
            await page.keyboard.up('Shift');

            await expect(page.locator('[data-kg-floating-toolbar]')).toBeVisible();

            const linkButtonSelector = '[data-kg-floating-toolbar] [data-kg-toolbar-button="link"] button';
            await expect(page.locator(linkButtonSelector)).toBeVisible();
        });

        test('does NOT have snippet button', async function () {
            await focusEditor(page);
            await page.keyboard.type('text for selection');

            // Select text
            await page.keyboard.down('Shift');
            for (let i = 0; i < 'for selection'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }
            await page.keyboard.up('Shift');

            await expect(page.locator('[data-kg-floating-toolbar]')).toBeVisible();

            const snippetButtonSelector = '[data-kg-floating-toolbar] [data-kg-toolbar-button="snippet"] button';
            await expect(page.locator(snippetButtonSelector)).toHaveCount(0);
        });
    });
});
