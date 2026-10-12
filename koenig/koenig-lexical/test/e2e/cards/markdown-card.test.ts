import path from 'path';
import {
    assertHTML,
    assertRootChildren,
    createSnippet,
    focusEditor,
    html,
    initialize,
    insertCard,
    selectBackwards
} from '../../utils/e2e';
import {expect, test} from '@playwright/test';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Click the markdown card and wait for CodeMirror to be focused
// (Chrome for Testing needs this before typing/shortcuts will register reliably)
async function focusMarkdownEditor(page) {
    await page.click('[data-kg-card="markdown"]');
    await expect(page.locator('[data-kg-card="markdown"] .CodeMirror-focused')).toBeVisible();
}

async function pressMarkdownShortcut(page, key, modifier) {
    const locator = '[data-kg-card="markdown"] [title^="Bold"]';
    const title = await page.locator(locator).getAttribute('title');

    if (!title) {
        throw new Error(`Unable to determine markdown shortcut modifier: missing title for locator "${locator}" while resolving toolbar shortcut intent.`);
    }

    await page.keyboard.press(`${modifier || (title.includes('Ctrl-') ? 'Control' : 'Meta')}+${key}`);
}

test.describe('Markdown card', async () => {
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

    for (const dark of [false, true]) {
        test(`owns Markdown toolbar and selection colours in ${dark ? 'dark' : 'light'} mode`, async function () {
            await initialize({page, uri: `/#/?content=false&darkMode=${dark}`});
            // Editor hosts don't define these variables. Poison them to catch an
            // accidental dependency on them.
            await page.evaluate(() => {
                for (const name of ['lightgrey', 'blue', 'yellow', 'orange']) {
                    document.documentElement.style.setProperty(`--${name}`, '#ff00ff');
                }
            });
            await focusEditor(page);
            await insertCard(page, {cardName: 'markdown'});
            await focusMarkdownEditor(page);
            await page.keyboard.type('Selected Markdown\n**Bold text** and https://example.com');
            await page.keyboard.press('ControlOrMeta+A');

            const separator = page.locator('.markdown-editor .editor-toolbar i.separator').first();
            await expect(separator).toHaveCSS('border-left-style', 'solid');
            await expect(separator).toHaveCSS('border-left-width', '1px');
            await expect(separator).toHaveCSS('border-left-color', dark ? 'rgb(124, 139, 154)' : 'rgb(206, 212, 217)');
            const selectedText = page.locator('.markdown-editor .CodeMirror-selectedtext').first();
            await expect(selectedText).toBeVisible();
            const selectionBackgrounds = page.locator('.markdown-editor .CodeMirror-selected');
            await expect(selectionBackgrounds.first()).toBeVisible();
            for (const background of await selectionBackgrounds.all()) {
                await expect(background).toHaveCSS('background-color', dark ? 'rgb(35, 69, 83)' : 'rgb(185, 234, 255)');
            }
            // CodeMirror paints the full-height highlight behind the marked text.
            // Painting a second highlight on the spans leaves the old layer visible
            // around their edges, looking like a light underline in dark mode.
            for (const text of await page.locator('.markdown-editor .CodeMirror-selectedtext').all()) {
                await expect(text).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
                await expect(text).toHaveCSS('color', dark ? 'rgb(244, 245, 246)' : 'rgb(21, 23, 26)');
                await expect(text).toHaveCSS('text-decoration-line', 'none');
            }
            await page.locator('.markdown-editor textarea').last().evaluate(element => element.blur());
            await expect(page.locator('.markdown-editor .CodeMirror-focused')).toHaveCount(0);
            for (const background of await selectionBackgrounds.all()) {
                await expect(background).toHaveCSS('background-color', dark ? 'rgb(35, 69, 83)' : 'rgb(185, 234, 255)');
            }

            await page.evaluate(() => {
                for (const name of ['lightgrey', 'blue', 'yellow', 'orange']) {
                    document.documentElement.style.removeProperty(`--${name}`);
                }
            });
        });
    }

    test('can import serialized markdown card node', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'markdown',
                        version: 1,
                        markdown: '# This is a heading'
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
                <div><svg></svg></div>
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="markdown">
                    <div>
                        <div><h1 id="this-is-a-heading">This is a heading</h1></div>
                        <div></div>
                    </div>
                </div>
            </div>
        `);
    });

    test('renders markdown card node', async function () {
        await focusEditor(page);
        await page.keyboard.type('/');

        await page.click('[data-kg-card-menu-item="Markdown"]');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div><svg></svg></div>
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="markdown">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test ('markdown card doesn\'t leave editing mode on double click inside', async function () {
        await focusEditor(page);
        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');

        await focusMarkdownEditor(page);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div><svg></svg></div>
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="markdown">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});

        await page.locator('.CodeMirror-line').dblclick();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div><svg></svg></div>
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="markdown">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('should open unsplash dialog on Cmd-Alt-O', async function () {
        await focusEditor(page);
        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);

        await pressMarkdownShortcut(page, 'Alt+O', 'Control');
        await page.waitForSelector('[data-kg-modal="unsplash"]');
    });

    test('should toggle spellcheck on Cmd-Alt-S', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'markdown'});

        await expect(page.locator('[title*="Spellcheck"]')).not.toBeNull();
        await pressMarkdownShortcut(page, 'Alt+S', 'Control');
        await expect(page.locator('[title*="Spellcheck"][class*="active"]')).toHaveCount(1);
    });

    test('should open image upload dialog on Cmd-Alt-I', async function () {
        const fileChooserPromise = page.waitForEvent('filechooser');
        await focusEditor(page);
        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await pressMarkdownShortcut(page, 'Alt+I', 'Control');
        await fileChooserPromise;
    });

    test('can display and close markdown help guide', async function () {
        await focusEditor(page);
        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);

        await page.click('a[title="Markdown Guide"]');
        await expect(await page.getByTestId('markdown-help-dialog')).toBeVisible();

        await page.click('button[aria-label="Close dialog"]');
        await expect(await page.getByTestId('markdown-help-dialog')).not.toBeVisible();
    });

    test('adds extra paragraph when markdown is inserted at end of document', async function () {
        await focusEditor(page);
        await page.click('[data-kg-plus-button]');
        await page.click('[data-kg-card-menu-item="Markdown"]');

        await expect(page.locator('[data-kg-card="markdown"][data-kg-card-editing="true"]')).toBeVisible();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div><svg></svg></div>
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="markdown">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('does not add extra paragraph when markdown is inserted mid-document', async function () {
        await focusEditor(page);
        await page.keyboard.press('Enter');
        await page.keyboard.type('Testing');
        await page.keyboard.press('ArrowUp');
        await page.click('[data-kg-plus-button]');
        await page.click('[data-kg-card-menu-item="Markdown"]');

        await expect(page.locator('[data-kg-card="markdown"][data-kg-card-editing="true"]')).toBeVisible();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div><svg></svg></div>
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="markdown">
                </div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
        `, {ignoreCardContents: true});
    });

    test('can upload an image', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        await focusEditor(page);
        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await page.waitForSelector('[data-kg-card="markdown"] .editor-toolbar');
        await pressMarkdownShortcut(page, 'Alt+I', 'Control');

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(filePath);

        // wait for progress bar to be shown and subsequently hidden
        // TODO: these assertions cause a flaky test now that we've shortened the upload step timeouts,
        // TODO: but we should find a way to re-enable them
        // await page.waitForSelector('[data-testid="progress-bar"]');
        // await expect(await page.getByTestId('progress-bar')).not.toBeVisible();

        // wait for image markdown to be inserted
        await page.waitForSelector('[data-kg-card="markdown"] .cm-image');

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '![large-image.png](blob:...)'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can insert bold text', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await pressMarkdownShortcut(page, 'B');
        await page.keyboard.type('bold text', {delay: 10});

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '**bold text**'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can convert text to bold', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await page.keyboard.type('bold', {delay: 10});
        // select the text
        await selectBackwards(page, 4);
        // make it bold
        await pressMarkdownShortcut(page, 'B');

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '**bold**'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can insert italic text', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await pressMarkdownShortcut(page, 'I');
        await page.keyboard.type('italic text', {delay: 10});

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '*italic text*'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can convert text to italic', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await page.keyboard.type('italic', {delay: 10});
        // select the text
        await selectBackwards(page, 6);
        // make it italic
        await pressMarkdownShortcut(page, 'I');

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '*italic*'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can insert strikethrough text', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await pressMarkdownShortcut(page, 'Alt+U');
        await page.keyboard.type('text', {delay: 10});

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '~~text~~'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can convert text to strikethrough', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await page.keyboard.type('text', {delay: 10});
        // select the text
        await selectBackwards(page, 4);
        // make it strikethrough
        await pressMarkdownShortcut(page, 'Alt+U');

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '~~text~~'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can insert heading', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await pressMarkdownShortcut(page, 'H');
        await page.keyboard.type('Heading text', {delay: 10});

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '# Heading text'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can convert line to heading', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await page.keyboard.type('Heading', {delay: 10});
        await pressMarkdownShortcut(page, 'H');

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '# Heading'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can insert quote', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await pressMarkdownShortcut(page, '\'');
        await page.keyboard.type('quote', {delay: 10});

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '> quote'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can convert line to quote', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await page.keyboard.type('quote', {delay: 10});
        await pressMarkdownShortcut(page, '\'');

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '> quote'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can insert an unordered list', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await pressMarkdownShortcut(page, 'L');
        await page.keyboard.type('First list item', {delay: 10});

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '* First list item'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can convert line to unordered list', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await page.keyboard.type('A list item', {delay: 10});
        await pressMarkdownShortcut(page, 'L');

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '* A list item'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can insert an ordered list', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await pressMarkdownShortcut(page, 'Alt+L');
        // Wait for CodeMirror to insert the list prefix before typing
        await expect(page.locator('[data-kg-card="markdown"] .CodeMirror-line')).toContainText('1.');
        await page.keyboard.type('First list item', {delay: 10});

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '1. First list item'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can convert line to ordered list', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await page.keyboard.type('A list item', {delay: 10});
        await pressMarkdownShortcut(page, 'Alt+L');

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '1. A list item'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can insert a link', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await pressMarkdownShortcut(page, 'K');

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '[](http://)'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can convert text to a link', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await focusMarkdownEditor(page);
        await page.keyboard.type('link', {delay: 10});
        // select the text
        await selectBackwards(page, 4);
        // convert to link
        await pressMarkdownShortcut(page, 'K');

        await assertRootChildren(page, JSON.stringify([
            {
                type: 'markdown',
                version: 1,
                markdown: '[link](http://)'
            },
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ]));
    });

    test('can add snippet', async function () {
        await focusEditor(page);
        // insert new card
        await insertCard(page, {cardName: 'markdown'});

        // fill card
        await expect(await page.locator('[data-kg-card="markdown"]')).toBeVisible();
        await focusMarkdownEditor(page);
        await page.keyboard.type('snippet', {delay: 10});
        await page.keyboard.press('Escape');

        // create snippet
        await createSnippet(page);

        // Wait for snippet toolbar to close and card to be back in selected state
        await expect(page.locator('[data-kg-card="markdown"][data-kg-card-selected="true"]')).toBeVisible();

        // can insert card from snippet
        await page.keyboard.press('Enter');
        await page.keyboard.type('/snippet');
        await expect(page.locator('[data-kg-cardmenu-selected="true"]').filter({hasText: 'snippet'})).toBeVisible();
        await page.keyboard.press('Enter');
        await expect(await page.locator('[data-kg-card="markdown"]')).toHaveCount(2);
    });

    test('can undo/redo content in markdown editor', async function () {
        await focusEditor(page);
        // insert new card
        await insertCard(page, {cardName: 'markdown'});

        // fill card
        await expect(await page.locator('[data-kg-card="markdown"]')).toBeVisible();
        await focusMarkdownEditor(page);
        await page.keyboard.type('Here are some words', {delay: 10});
        await expect(page.getByText('Here are some words')).toBeVisible();
        await page.keyboard.press('Backspace');
        await expect(page.getByText('Here are some word')).toBeVisible();
        await pressMarkdownShortcut(page, 'z');
        await expect(page.getByText('Here are some words')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByText('Here are some words')).toBeVisible();
    });
});
