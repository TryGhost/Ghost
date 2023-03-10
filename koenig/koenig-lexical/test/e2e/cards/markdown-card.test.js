import path from 'path';
import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, assertRootChildren, focusEditor, html, initialize, isMac, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

describe('Markdown card', async () => {
    let app;
    let page;

    const ctrlOrCmd = isMac() ? 'Meta' : 'Control';

    beforeAll(async () => {
        ({app, page} = await startApp());
    });

    afterAll(async () => {
        await app.stop();
    });

    beforeEach(async () => {
        await initialize({page});
    });

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
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="markdown">
                    <div><h1 id="this-is-a-heading">This is a heading</h1></div>
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

    test('can display and close markdown help guide', async function () {
        await focusEditor(page);
        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await page.click('[data-kg-card="markdown"]');

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
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="markdown">
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
                <div data-kg-card-selected="true" data-kg-card-editing="true" data-kg-card="markdown">
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
        await page.keyboard.press(`${ctrlOrCmd}+Alt+I`);

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(filePath);

        // wait for progress bar to be shown and subsequently hidden
        await page.waitForSelector('[data-testid="progress-bar"]');
        await expect(await page.getByTestId('progress-bar')).not.toBeVisible();

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
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.press(`${ctrlOrCmd}+B`);
        await page.keyboard.type('bold text');

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
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.type('bold');
        // select the text
        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.up('Shift');
        // make it bold
        await page.keyboard.press(`${ctrlOrCmd}+B`);

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
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.press(`${ctrlOrCmd}+I`);
        await page.keyboard.type('italic text');

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
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.type('italic');
        // select the text
        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.up('Shift');
        // make it italic
        await page.keyboard.press(`${ctrlOrCmd}+I`);

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

    test('can insert heading', async function () {
        await focusEditor(page);

        await page.keyboard.type('/');
        await page.click('[data-kg-card-menu-item="Markdown"]');
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.press(`${ctrlOrCmd}+H`);
        await page.keyboard.type('Heading text');

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
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.type('Heading');
        await page.keyboard.press(`${ctrlOrCmd}+H`);

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
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.press(`${ctrlOrCmd}+'`);
        await page.keyboard.type('quote');

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
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.type('quote');
        await page.keyboard.press(`${ctrlOrCmd}+'`);

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
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.press(`${ctrlOrCmd}+L`);
        await page.keyboard.type('First list item');

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
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.type('A list item');
        await page.keyboard.press(`${ctrlOrCmd}+L`);

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
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.press(`${ctrlOrCmd}+Alt+L`);
        await page.keyboard.type('First list item');

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
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.type('A list item');
        await page.keyboard.press(`${ctrlOrCmd}+Alt+L`);

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
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.press(`${ctrlOrCmd}+K`);

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
        await page.click('[data-kg-card="markdown"]');
        await page.keyboard.type('link');
        // select the text
        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.up('Shift');
        // convert to link
        await page.keyboard.press(`${ctrlOrCmd}+K`);

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
});
