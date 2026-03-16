import {assertHTML, html, initialize} from '../utils/e2e';
// import {calloutColorPicker} from '../../../src/components/ui/cards/CalloutCardx';
import {test} from '@playwright/test';

test.describe('Node transforms', async () => {
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

    test('nested elements in paragraph nodes 1', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    children: [
                                        {
                                            detail: 0,
                                            format: 0,
                                            mode: 'normal',
                                            style: '',
                                            text: 'Hello Fintech Friends,',
                                            type: 'text',
                                            version: 1
                                        }
                                    ],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'paragraph',
                                    version: 1
                                },
                                {
                                    type: 'horizontalrule',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
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
            <p></p>
            <p dir="ltr"><span data-lexical-text="true">Hello Fintech Friends,</span></p>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                </div>
            </div>
            <p></p>
        `, {ignoreCardContents: true});
    });

    test('nested elements in paragraph nodes 2', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Hello Fintech Friends,',
                                    type: 'text',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        },
                        {
                            children: [
                                {
                                    children: [],
                                    direction: 'ltr',
                                    format: '',
                                    indent: 0,
                                    type: 'paragraph',
                                    version: 1
                                },
                                {
                                    type: 'horizontalrule',
                                    version: 1
                                }
                            ],
                            direction: 'ltr',
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
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
            <p dir="ltr"><span data-lexical-text="true">Hello Fintech Friends,</span></p>
            <p></p>
            <p><br /></p>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                </div>
            </div>
            <p></p>
        `, {ignoreCardContents: true});
    });
});
