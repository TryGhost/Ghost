import {beforeAll, afterAll, beforeEach, describe, test} from 'vitest';
import {startApp, initialize, focusEditor, assertHTML, html, assertSelection} from '../utils/e2e';

describe('Card behaviour', async () => {
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

    describe('CLICKS', function () {
        test('click selects card', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('--- ');

            // clicking first HR card makes it selected
            await page.click('hr');
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="true" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="false" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);

            // clicking second HR card deselects the first and selects the second
            await page.click('[data-lexical-decorator]:nth-of-type(2) hr');
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="false" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="true" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);
        });

        test('click keeps selection', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.click('hr');
            await page.click('hr');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="true" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);
        });

        test('click off deselects', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.click('hr');
            await page.click('p');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="false" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);
        });

        test('click outside editor deselects', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.click('hr');
            await page.click('body');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="false" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);
        });

        test.todo('double-click puts card in edit mode');
        test.todo('lazy click puts card in edit mode');
    });

    describe('LEFT', function () {
        // deselects card and moves cursor onto paragraph
        test('with selected card after paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('--- ');
            await page.click('hr');

            await assertHTML(page, html`
                <p><br></p>
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="true" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowLeft');

            await assertHTML(page, html`
                <p><br></p>
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="false" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });
        });

        // moves selection to previous card
        test.todo('when selected card after card');
        // triggers "caret left at top" prop fn
        test.todo('when selected card is first section');
    });

    describe('RIGHT', function () {
        test('with selected card before paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.click('hr');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="true" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowRight');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="false" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1],
                focusOffset: 0,
                focusPath: [1]
            });
        });
    });

    describe('ENTER', function () {
        test('with selected card creates paragraph after and moves selection', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.click('hr');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="true" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('Enter');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="false" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
                <p><br></p>
            `);

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1],
                focusOffset: 0,
                focusPath: [1]
            });
        });
    });

    describe('BACKSPACE', function () {
        // deletes card and puts cursor at end of previous paragraph
        test('with selected card after paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('Testing');
            await page.keyboard.press('Enter');
            await page.keyboard.type('--- ');
            await page.click('hr');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="true" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
                <p><br></p>
            `);

            await assertSelection(page, {
                anchorOffset: 7,
                anchorPath: [0, 0, 0],
                focusOffset: 7,
                focusPath: [0, 0, 0]
            });
        });

        test('with selected card after card', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('--- ');
            await page.click('[data-lexical-decorator]:nth-of-type(2) hr');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="false" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="true" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="true" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);
        });

        test('with selected card as first section followed by paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('Testing');
            await page.click('hr');
            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
            `);

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0, 0, 0],
                focusOffset: 0,
                focusPath: [0, 0, 0]
            });
        });

        test('with selected card as first section followed card', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('--- ');
            await page.click('hr');
            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="true" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);
        });
    });

    describe('DELETE', function () {
        test('with selected card before paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('Testing');
            await page.click('hr');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="true" data-kg-card="horizontalrule">
                            <hr>
                    </div>
                </div>
                <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
            `);

            await page.keyboard.press('Delete');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
            `);

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0, 0, 0],
                focusOffset: 0,
                focusPath: [0, 0, 0]
            });
        });

        test('with selected card before card', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('--- ');
            await page.click('hr');

            await page.keyboard.press('Delete');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-selected="true" data-kg-card="horizontalrule">
                            <hr>
                        </div>
                </div>
                <p><br></p>
            `);
        });

        // general BACKSPACE behaviour needed to delete trailing
        // paragraph after HR card without also deleting the card
        test.todo('with selected card as last section');
    });
});
