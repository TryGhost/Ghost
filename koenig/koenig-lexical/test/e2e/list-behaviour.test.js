import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, assertSelection, focusEditor, html, initialize, startApp} from '../utils/e2e';

describe('List behaviour', async () => {
    let app;
    let page;

    beforeAll(async function () {
        ({app, page} = await startApp());
    });

    afterAll(async function () {
        await app.stop();
    });

    beforeEach(async function () {
        await initialize({page});
    });

    describe('BACKSPACE', function () {
        test('at beginning of populated list item after paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('Paragraph');
            await page.keyboard.press('Enter');
            await page.keyboard.type('- first li');
            await page.keyboard.press('Enter');
            await page.keyboard.type('second li');

            // sanity check - contents are as we expect
            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">Paragraph</span></p>
                <ul>
                    <li value="1" dir="ltr"><span data-lexical-text="true">first li</span></li>
                    <li value="2" dir="ltr"><span data-lexical-text="true">second li</span></li>
                </ul>
            `);

            await page.keyboard.press('ArrowUp');
            for (let i = 0; i < 'first li'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }

            // sanity check - cursor is at beginning of list
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1,0,0,0],
                focusOffset: 0,
                focusPath: [1,0,0,0]
            });

            // should convert list item to a paragraph
            await page.keyboard.press('Backspace');

            // first list item converted to a paragraph
            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">Paragraph</span></p>
                <p dir="ltr"><span data-lexical-text="true">first li</span></p>
                <ul>
                    <li value="1" dir="ltr"><span data-lexical-text="true">second li</span></li>
                </ul>
            `);

            // selection is at beginning of li->p paragraph
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1,0,0],
                focusOffset: 0,
                focusPath: [1,0,0]
            });

            // pressing again reverts to default Lexical behaviour of smushing paragraphs
            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">Paragraphfirst li</span></p>
                <ul>
                    <li value="1" dir="ltr"><span data-lexical-text="true">second li</span></li>
                </ul>
            `);
        });

        test('at beginning of populated list after card', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('- first li');
            await page.keyboard.press('Enter');
            await page.keyboard.type('second li');

            // sanity check - contents are as we expect
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <ul>
                    <li value="1" dir="ltr"><span data-lexical-text="true">first li</span></li>
                    <li value="2" dir="ltr"><span data-lexical-text="true">second li</span></li>
                </ul>
            `);

            await page.keyboard.press('ArrowUp');
            for (let i = 0; i < 'first li'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }

            // sanity check - cursor is at beginning of list
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1,0,0,0],
                focusOffset: 0,
                focusPath: [1,0,0,0]
            });

            // should convert list item to a paragraph
            await page.keyboard.press('Backspace');

            // first list item converted to a paragraph
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p dir="ltr"><span data-lexical-text="true">first li</span></p>
                <ul>
                    <li value="1" dir="ltr"><span data-lexical-text="true">second li</span></li>
                </ul>
            `);
        });

        test('at beginning of populated list-item mid list', async function () {
            await focusEditor(page);
            await page.keyboard.type('- first li');
            await page.keyboard.press('Enter');
            await page.keyboard.type('second li');
            await page.keyboard.press('Enter');
            await page.keyboard.type('third li');

            for (let i = 0; i < 'third li'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }
            await page.keyboard.press('ArrowUp');

            // sanity check - cursor is at beginning of second list item
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0,1,0,0],
                focusOffset: 0,
                focusPath: [0,1,0,0]
            });

            // should split list converting second li to paragraph
            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <ul>
                    <li value="1" dir="ltr"><span data-lexical-text="true">first li</span></li>
                </ul>
                <p dir="ltr"><span data-lexical-text="true">second li</span></p>
                <ul>
                    <li value="1" dir="ltr"><span data-lexical-text="true">third li</span></li>
                </ul>
            `);

            // selection is at beginning of the converted paragraph
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1,0,0],
                focusOffset: 0,
                focusPath: [1,0,0]
            });
        });

        test('on empty list item after paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('First paragraph');
            await page.keyboard.press('Enter');
            await page.keyboard.type('- ');

            // sanity check
            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">First paragraph</span></p>
                <ul>
                    <li value="1"><br /></li>
                </ul>
            `);

            // should convert list to a paragraph
            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">First paragraph</span></p>
                <p><br /></p>
            `);

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1],
                focusOffset: 0,
                focusPath: [1]
            });
        });

        test('on empty list item at end of list', async function () {
            await focusEditor(page);
            await page.keyboard.type('- first li');
            await page.keyboard.press('Enter');

            // should convert last list item to empty paragraph
            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <ul>
                    <li value="1" dir="ltr"><span data-lexical-text="true">first li</span></li>
                </ul>
                <p><br /></p>
            `);
        });
    });
});
