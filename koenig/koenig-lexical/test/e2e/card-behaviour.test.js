import {beforeAll, afterAll, beforeEach, describe, test} from 'vitest';
import {expect} from '@playwright/test';
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
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            // clicking second HR card deselects the first and selects the second
            await page.click('[data-lexical-decorator]:nth-of-type(2) hr');
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
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
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
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
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
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
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);
        });

        test('double-click on an unselected card puts it into edit mode', async function () {
            await focusEditor(page);
            // TODO: Update this after setting to isEditing on creation
            await page.keyboard.type('```javascript ');

            await page.click('div[data-kg-card="codeblock"]');
            await page.click('div[data-kg-card="codeblock"]');

            expect(await page.$('[data-kg-card-editing="true"]')).not.toBeNull();
        });

        test('single clicking on a selected card puts it into edit mode', async function () {
            await focusEditor(page);
            // TODO: Update this after setting to isEditing on creation
            await page.keyboard.type('```javascript ');
            // Click to select
            await page.click('div[data-kg-card="codeblock"]');
            // Click to edit
            await page.click('div[data-kg-card="codeblock"]');

            expect(await page.$('[data-kg-card-editing="true"]')).not.toBeNull();
        });

        test('clicking outside the edit mode card switches back to display mode', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await page.keyboard.type('```javascript ');

            await page.click('div[data-kg-card="codeblock"]');
            await page.click('div[data-kg-card="codeblock"]');

            expect(await page.$('[data-kg-card-editing="true"]')).not.toBeNull();

            await page.click('p');
            expect(await page.$('[data-kg-card-editing="false"]'));
        });

        test('clicking outside the empty edit mode card removes the card', async function () {
            await focusEditor(page);
            await page.keyboard.type('```javascript ');

            expect(await page.$('[data-kg-card-editing="true"]')).not.toBeNull();

            await page.click('.koenig-lexical');
            await assertHTML(page, html`
                <p><br /></p>
            `);
        });

        test('clicking on another card when a card is in edit mode selected new card and switches old card to display mode', async function () {
            await focusEditor(page);
            await page.keyboard.type('```python ');
            await page.waitForSelector('[data-kg-card="codeblock"] [contenteditable="true"]');
            await page.keyboard.type('import pandas as pd');
            await page.keyboard.press('Meta+Enter');
            await page.waitForSelector('[data-kg-card="codeblock"][data-kg-card-selected="true"][data-kg-card-editing="false"]');
            await page.keyboard.press('Enter');
            await page.keyboard.type('```javascript ');
            await page.waitForSelector('[data-kg-card="codeblock"] [contenteditable="true"]');
            await page.keyboard.type('import React from "react"');
            await page.keyboard.press('Meta+Enter');
            await page.waitForSelector('[data-kg-card="codeblock"][data-kg-card-selected="true"][data-kg-card-editing="false"]');

            // Neither card should be in editing mode right now
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="codeblock">
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="codeblock">
                    </div>
                </div>
            `, {ignoreCardContents: true});

            // Select the python card
            await page.click('div[data-kg-card="codeblock"]');
            // Click the selected card again to enter editing mode
            await page.click('div[data-kg-card-selected="true"]');

            // Now the first card should be editing and the second card should not be
            expect(await page.$('[data-kg-card-editing="true"]')).not.toBeNull();
            expect(await page.$('[data-kg-card-editing="false"]')).not.toBeNull();

            // Click the card that's not currently editing (second card)
            await page.click('div[data-kg-card-editing="false"]');
            // Now neither card should be editing
            expect(await page.$('[data-kg-card-editing="true"]')).toBeNull();

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="codeblock">
                        <div>
                            <pre><code class="language-python">import pandas as pd</code></pre>
                            <div><span>python</span></div>
                        </div>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="codeblock">
                        <div>
                            <pre><code class="language-javascript">import React from "react"</code></pre>
                            <div><span>javascript</span></div>
                        </div>
                    </div>
                </div>
            `);
        });

        test('clicking below the editor focuses the editor if last node is a paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('Here is some text');

            await page.mouse.click(100, 900);
            await assertSelection(page, {
                anchorOffset: 1,
                anchorPath: [0],
                focusOffset: 1,
                focusPath: [0]
            });
        });

        test('clicking below the editor focuses the editor if last node is a card', async function () {
            await focusEditor(page);
            await page.keyboard.type('```javascript ');
            await page.waitForSelector('[data-kg-card="codeblock"] .cm-editor');
            await page.keyboard.type('import React from "react"');
            await page.keyboard.press('Meta+Enter');
            await page.waitForSelector('[data-kg-card="codeblock"][data-kg-card-selected="true"][data-kg-card-editing="false"]');

            await page.mouse.click(100, 900);

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="codeblock">
                    </div>
                </div>
                <p><br /></p>
            `, {ignoreCardContents: true});

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1],
                focusOffset: 0,
                focusPath: [1]
            });
        });

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
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowLeft');

            await assertHTML(page, html`
                <p><br></p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
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
        test('when selected card is after card', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('--- ');

            await page.keyboard.press('ArrowLeft');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowLeft');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);
        });

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
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowRight');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
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

        // moves selection to previous card
        test('when selected card is before card', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('--- ');
            await page.click('hr');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowRight');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowRight');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [2],
                focusOffset: 0,
                focusPath: [2]
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
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule"><hr /></div>
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
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);

            await page.keyboard.press('ArrowUp');

            // first card is now selected
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule"><hr /></div>
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
                anchorOffset: 220,
                anchorPath: [1, 0, 0],
                focusOffset: 220,
                focusPath: [1, 0, 0]
            });

            await page.keyboard.press('ArrowUp');

            await assertSelection(page, {
                anchorOffset: 150,
                anchorPath: [1, 0, 0],
                focusOffset: 150,
                focusPath: [1, 0, 0]
            });

            await page.keyboard.press('ArrowUp');

            await assertSelection(page, {
                anchorOffset: 76,
                anchorPath: [1, 0, 0],
                focusOffset: 76,
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
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule"><hr /></div>
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
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule"><hr /></div>
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
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule"><hr /></div>
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
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);

            await page.keyboard.press('ArrowDown');

            // first card is now selected
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule"><hr /></div>
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
                anchorPath: [0, 3, 0],
                focusOffset: 0,
                focusPath: [0, 3, 0]
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
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule"><hr /></div>
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
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('Enter');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
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
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
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
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
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

        test('with selected card as first section followed by card', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.type('--- ');
            await page.click('hr');
            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);
        });

        // deletes empty paragraph, selects card
        test('on empty paragraph after card', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.keyboard.press('Enter');
            await page.keyboard.type('Populated paragraph after empty paragraph');
            await page.keyboard.press('ArrowUp');

            // sanity check - cursor is on empty paragraph
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1],
                focusOffset: 0,
                focusPath: [1]
            });

            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p dir="ltr"><span data-lexical-text="true">Populated paragraph after empty paragraph</span></p>
            `);
        });

        // deletes card, keeps selection at beginning of paragraph
        test('at beginning of paragraph after card', async function () {
            await focusEditor(page);
            await page.keyboard.type('First paragraph');
            await page.keyboard.press('Enter');
            await page.keyboard.type('--- ');
            await page.keyboard.type('Second paragraph');
            for (let i = 0; i < 'Second paragraph'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }
            // await page.keyboard.press('Control+KeyA');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">First paragraph</span></p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><span data-lexical-text="true">Second paragraph</span></p>
            `);

            // sanity check - cursor is at beginning of second paragraph
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [2, 0, 0],
                focusOffset: 0,
                focusPath: [2, 0, 0]
            });

            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">First paragraph</span></p>
                <p><span data-lexical-text="true">Second paragraph</span></p>
            `);

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1, 0, 0],
                focusOffset: 0,
                focusPath: [1, 0, 0]
            });
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
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
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
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);
        });

        // deletes paragraph and selects card
        test('on empty paragraph before card', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('--- ');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.press('ArrowUp');

            await assertHTML(page, html`
                <p><br></p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
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

            await page.keyboard.press('Delete');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('Delete');

            await assertHTML(page, html`
                <p><br></p>
            `);

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });
        });

        // deletes card, keeping caret at end of paragraph
        test('at end of paragraph before card', async function () {
            await focusEditor(page);
            await page.keyboard.type('First paragraph');
            await page.keyboard.press('Enter');
            await page.keyboard.type('--- ');
            await page.keyboard.type('Second paragraph');
            await page.click('p:nth-of-type(1)');

            await assertSelection(page, {
                anchorOffset: 15,
                anchorPath: [0, 0, 0],
                focusOffset: 15,
                focusPath: [0, 0, 0]
            });

            await page.keyboard.press('Delete');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">First paragraph</span></p>
                <p><span data-lexical-text="true">Second paragraph</span></p>
            `);

            await assertSelection(page, {
                anchorOffset: 15,
                anchorPath: [0, 0, 0],
                focusOffset: 15,
                focusPath: [0, 0, 0]
            });

            await page.keyboard.press('Delete');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">First paragraphSecond paragraph</span></p>
            `);
        });
    });

    describe('CMD+ENTER', function () {
        test('with a non-edit-mode card selected', async function () {
            await focusEditor(page);
            await page.keyboard.type('--- ');
            await page.click('hr');

            expect(await page.$('[data-kg-card-selected="true"]')).not.toBeNull();

            await page.keyboard.press('Meta+Enter');

            // card does not enter edit mode
            expect(await page.$('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.$('[data-kg-card-editing="true"]')).toBeNull();
            expect(await page.$('[data-kg-card-editing="false"]')).not.toBeNull();
        });

        test('with an edit-mode card selected', async function () {
            await focusEditor(page);
            await page.keyboard.type('``` ');
            await page.waitForSelector('[data-kg-card="codeblock"] .cm-editor');
            await page.keyboard.type('import React from "react"');
            await page.click('[data-kg-card="codeblock"]');

            expect(await page.$('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.$('[data-kg-card-editing="true"]')).not.toBeNull();

            await page.keyboard.press('Meta+Enter');

            // card exits edit mode
            expect(await page.$('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.$('[data-kg-card-editing="false"]')).not.toBeNull();

            await page.keyboard.press('Meta+Enter');

            // card enters edit mode
            expect(await page.$('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.$('[data-kg-card-editing="true"]')).not.toBeNull();
        });
    });

    describe('ESCAPE', function () {
        test('with an edit mode card that is not empty', async function () {
            await focusEditor(page);
            await page.keyboard.type('``` ');
            await page.waitForSelector('[data-kg-card="codeblock"]');
            await page.keyboard.type('import React from "react"');

            expect(await page.$('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.$('[data-kg-card-editing="true"]')).not.toBeNull();

            await page.keyboard.press('Escape');

            // card exits edit mode
            expect(await page.$('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.$('[data-kg-card-editing="false"]')).not.toBeNull();

            // card is still able to re-enter edit mode with CMD+ETNER
            await page.keyboard.press('Meta+Enter');

            expect(await page.$('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.$('[data-kg-card-editing="true"]')).not.toBeNull();
        });

        test('with an edit mode card that is empty', async function () {
            await focusEditor(page);
            await page.keyboard.type('``` ');
            await page.waitForSelector('[data-kg-card="codeblock"]');

            expect(await page.$('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.$('[data-kg-card-editing="true"]')).not.toBeNull();

            await page.keyboard.press('Escape');

            // card is removed leaving the empty paragraph
            await assertHTML(page, html`
                <p><br></p>
            `);

            // paragraph is selected
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });
        });

        test('with an edit mode card that is empty before existing content', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('Testing');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.type('``` ');
            await page.waitForSelector('[data-kg-card="codeblock"]');

            expect(await page.$('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.$('[data-kg-card-editing="true"]')).not.toBeNull();

            await page.keyboard.press('Escape');

            // card is removed leaving the existing paragraph
            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
            `);

            // cursor is at beginning of trailing paragraph
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0, 0, 0],
                focusOffset: 0,
                focusPath: [0, 0, 0]
            });
        });

        test('with an edit mode card that is empty before another card', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('--- ');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.type('``` ');
            await page.waitForSelector('[data-kg-card="codeblock"]');

            expect(await page.$('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.$('[data-kg-card-editing="true"]')).not.toBeNull();

            await page.keyboard.press('Escape');

            // card is removed leaving the existing card
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div
                        data-kg-card-selected="true"
                        data-kg-card-editing="false"
                        data-kg-card="horizontalrule"
                    >
                        <hr />
                    </div>
                </div>
                <p><br /></p>
            `);

            // test editor does actually have focus by trying to move the caret
            await page.keyboard.press('ArrowDown');

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1],
                focusOffset: 0,
                focusPath: [1]
            });
        });
    });

    describe('SELECTION', function () {
        test('shift+down does not put card in selected state', async function () {
            await focusEditor(page);
            await page.keyboard.type('First');
            await page.keyboard.press('Enter');
            await page.keyboard.type('--- ');
            await page.keyboard.type('Second');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.press('ArrowUp');

            // sanity check
            await assertSelection(page, {
                anchorPath: [0, 0, 0],
                anchorOffset: 0,
                focusPath: [0, 0, 0],
                focusOffset: 0
            });

            await page.keyboard.down('Shift');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.up('Shift');

            await assertSelection(page, {
                anchorPath: [0, 0, 0],
                anchorOffset: 0,
                focusPath: [2, 0, 0],
                focusOffset: 6
            });

            await expect(page.locator('[data-kg-card-selected="true"]')).not.toBeVisible();
        });

        test('shift+up does not put card in selected state', async function () {
            await focusEditor(page);
            await page.keyboard.type('First');
            await page.keyboard.press('Enter');
            await page.keyboard.type('--- ');
            await page.keyboard.type('Second');

            // sanity check
            await assertSelection(page, {
                anchorPath: [2, 0, 0],
                anchorOffset: 6,
                focusPath: [2, 0, 0],
                focusOffset: 6
            });

            await page.keyboard.down('Shift');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.up('Shift');

            await assertSelection(page, {
                anchorPath: [2, 0, 0],
                anchorOffset: 6,
                focusPath: [0, 0, 0],
                focusOffset: 0
            });

            await expect(page.locator('[data-kg-card-selected="true"]')).not.toBeVisible();
        });
    });
});
