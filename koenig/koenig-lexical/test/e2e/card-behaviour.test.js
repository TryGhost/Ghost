import {beforeAll, afterAll, beforeEach, describe, test} from 'vitest';
import {startApp, initialize, focusEditor, assertHTML, html, assertSelection, pasteText} from '../utils/e2e';

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

    describe('UP', function () {
        // moves caret to end of paragraph
        // TODO: there's an upstream bug that skips last line of paragraph,
        // see https://github.com/facebook/lexical/issues/3270
        test.skip('with selected card after paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('First line');
            await page.keyboard.down('Shift');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Shift');
            await page.keyboard.type('Second line');
            await page.keyboard.press('Enter');
            await page.keyboard.type('/hr');
            await page.keyboard.press('Enter');

            // sanity check
            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">First line</span>
                    <br />
                    <span data-lexical-text="true">Second line</span>
                </p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p dir="ltr"><br /></p>
            `);

            await page.click('[data-kg-card="horizontalrule"]');
            expect(await page.$('[data-kg-card-selected="true"]')).not.toBeNull();

            await page.keyboard.press('ArrowUp');

            // caret is at end of second line of paragraph
            await assertSelection(page, {
                anchorOffset: 11,
                anchorPath: [0, 0, 0],
                focusOffset: 11,
                focusPath: [0, 0, 0]
            });

            // card is no longer selected
            expect(await page.$('[data-kg-card-selected="true"]')).toBeNull();
        });

        // selects the previous card
        test('with selected card after card', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('--- ');
            await page.click('[data-lexical-decorator]:nth-of-type(2)');

            // sanity check, second card is selected
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);

            await page.keyboard.press('ArrowUp');

            // first card is now selected
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);
        });

        // selects the card once caret reaches top of paragraph
        test('moving through paragraph to card', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            // three lines of text - paste it because keyboard.type is slow for long text
            await pasteText(page, 'Chislic bacon flank andouille picanha turkey porchetta chuck venison shank. Beef sirloin bresaola, meatball hamburger pork belly shankle. Frankfurter brisket t-bone alcatra porchetta tongue flank pork chop kevin picanha prosciutto meatball.');

            // place cursor at beginning of third line
            const pHandle = await page.$('[data-lexical-editor] > p');
            const pRect = await page.evaluate((el) => {
                const {x, y, height} = el.getBoundingClientRect();
                return {x, y, height};
            }, pHandle);
            await page.mouse.click(pRect.x + 1, pRect.y + pRect.height - 5);

            await assertSelection(page, {
                anchorOffset: 160,
                anchorPath: [1, 0, 0],
                focusOffset: 160,
                focusPath: [1, 0, 0]
            });

            await page.keyboard.press('ArrowUp');

            await assertSelection(page, {
                anchorOffset: 81,
                anchorPath: [1, 0, 0],
                focusOffset: 81,
                focusPath: [1, 0, 0]
            });

            await page.keyboard.press('ArrowUp');

            expect(await page.$('[data-kg-card-selected="true"]')).toBeNull();
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1, 0, 0],
                focusOffset: 0,
                focusPath: [1, 0, 0]
            });

            await page.keyboard.press('ArrowUp');

            // card is selected
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p dir="ltr">
                    <span data-lexical-text="true">
                        Chislic bacon flank andouille picanha turkey porchetta chuck venison shank. Beef
                        sirloin bresaola, meatball hamburger pork belly shankle. Frankfurter brisket t-bone
                        alcatra porchetta tongue flank pork chop kevin picanha prosciutto meatball.
                    </span>
                </p>
            `);
        });

        test('moving through paragraph with breaks to card', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('First line');
            await page.keyboard.down('Shift');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Shift');
            await page.keyboard.type('Second line after break');

            // sanity check, caret is at end of second line after break
            await assertSelection(page, {
                anchorOffset: 23,
                anchorPath: [1, 3, 0],
                focusOffset: 23,
                focusPath: [1, 3, 0]
            });

            await page.keyboard.press('ArrowUp');

            // caret moved to empty line
            await assertSelection(page, {
                anchorOffset: 2,
                anchorPath: [1],
                focusOffset: 2,
                focusPath: [1]
            });

            await page.keyboard.press('ArrowUp');

            // caret moved to end of first line
            await assertSelection(page, {
                anchorOffset: 10,
                anchorPath: [1, 0, 0],
                focusOffset: 10,
                focusPath: [1, 0, 0]
            });

            await page.keyboard.press('ArrowUp');

            // card is selected
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p dir="ltr">
                    <span data-lexical-text="true">First line</span>
                    <br>
                    <br>
                    <span data-lexical-text="true">Second line after break</span>
                </p>
            `);
        });
    });

    describe('DOWN', function () {
        // moves caret to beginning of paragraph
        // TODO: there's an upstream bug that skips last line of paragraph,
        // see https://github.com/facebook/lexical/issues/3270
        test.skip('with selected card before paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('First line');
            await page.keyboard.down('Shift');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Shift');
            await page.keyboard.type('Second line');

            await page.click('[data-lexical-decorator]');

            // sanity check
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p dir="ltr">
                    <span data-lexical-text="true">First line</span>
                    <br />
                    <span data-lexical-text="true">Second line</span>
                </p>
            `);

            await page.keyboard.press('ArrowDown');

            // caret is at beginning of paragraph
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0, 0, 0],
                focusOffset: 0,
                focusPath: [0, 0, 0]
            });

            // card is no longer selected
            expect(await page.$('[data-kg-card-selected="true"]')).toBeNull();
        });

        // selects the next card
        test('with selected card before card', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('--- ');
            await page.click('[data-lexical-decorator]');

            // sanity check, first card is selected
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);

            await page.keyboard.press('ArrowDown');

            // first card is now selected
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);
        });

        // selects the card once caret reaches bottom of paragraph
        test('moving through paragraph to card', async function () {
            await focusEditor(page);
            await page.keyboard.type('First line');
            await page.keyboard.down('Shift');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Shift');
            await page.keyboard.type('Second line after break');
            await page.keyboard.press('Enter');
            await page.keyboard.type('--- ');

            // place cursor at beginning of first line
            const pHandle = await page.$('[data-lexical-editor] > p');
            const pRect = await page.evaluate((el) => {
                const {x, y} = el.getBoundingClientRect();
                return {x, y};
            }, pHandle);
            await page.mouse.click(pRect.x + 5, pRect.y + 5);

            // sanity check
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0, 0, 0],
                focusOffset: 0,
                focusPath: [0, 0, 0]
            });

            await page.keyboard.press('ArrowDown');

            // caret on blank break line
            await assertSelection(page, {
                anchorOffset: 2,
                anchorPath: [0],
                focusOffset: 2,
                focusPath: [0]
            });

            await page.keyboard.press('ArrowDown');

            // caret on second line after break
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0, 3 ,0],
                focusOffset: 0,
                focusPath: [0, 3 ,0]
            });

            await page.keyboard.press('ArrowDown');

            // card is selected
            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">First line</span>
                    <br>
                    <br>
                    <span data-lexical-text="true">Second line after break</span>
                </p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);
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
