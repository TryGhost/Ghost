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
                    <div>
                        <div data-kg-card="true" data-kg-card-selected="true">
                            <hr>
                        </div>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div>
                        <div data-kg-card="true" data-kg-card-selected="false">
                            <hr>
                        </div>
                    </div>
                </div>
                <p><br></p>
            `);

            // clicking second HR card deselects the first and selects the second
            await page.click('[data-lexical-decorator]:nth-of-type(2) hr');
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div>
                        <div data-kg-card="true" data-kg-card-selected="false">
                            <hr>
                        </div>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div>
                        <div data-kg-card="true" data-kg-card-selected="true">
                            <hr>
                        </div>
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
                    <div>
                        <div data-kg-card="true" data-kg-card-selected="true">
                            <hr>
                        </div>
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
                    <div>
                        <div data-kg-card="true" data-kg-card-selected="false">
                            <hr>
                        </div>
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
                    <div>
                        <div data-kg-card="true" data-kg-card-selected="false">
                            <hr>
                        </div>
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
                    <div>
                        <div data-kg-card="true" data-kg-card-selected="true">
                            <hr>
                        </div>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowLeft');

            await assertHTML(page, html`
                <p><br></p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div>
                        <div data-kg-card="true" data-kg-card-selected="false">
                            <hr>
                        </div>
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
                    <div>
                        <div data-kg-card="true" data-kg-card-selected="true">
                            <hr>
                        </div>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowRight');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div>
                        <div data-kg-card="true" data-kg-card-selected="false">
                            <hr>
                        </div>
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
                    <div>
                        <div data-kg-card="true" data-kg-card-selected="true">
                            <hr>
                        </div>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('Enter');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div>
                        <div data-kg-card="true" data-kg-card-selected="false">
                            <hr>
                        </div>
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
        test.todo('with selected card after paragraph');
        test.todo('with selected card as first section');
    });

    describe('DELETE', function () {
        test.todo('with selected card after paragraph');
        test.todo('with selected card as first section');
    });
});
