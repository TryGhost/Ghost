import {assertHTML, assertSelection, ctrlOrCmd, focusEditor, html, initialize, insertCard, pasteText} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Card behaviour', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async ({context}) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await initialize({page});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('CLICKS', function () {
        test('click selects card', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('---');

            // clicking first HR card makes it selected
            await page.click('hr');
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            // clicking second HR card deselects the first and selects the second
            await page.click('[data-lexical-decorator]:nth-of-type(2) hr');
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);
        });

        test('click keeps selection', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.click('hr');
            await page.click('hr');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);
        });

        test('click off deselects', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.click('hr');
            await page.click('p');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);
        });

        test('click outside editor deselects', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.click('hr');
            await page.click('body');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
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

            expect(await page.locator('[data-kg-card-editing="true"]')).not.toBeNull();
        });

        test('single clicking on a selected card puts it into edit mode', async function () {
            await focusEditor(page);
            // TODO: Update this after setting to isEditing on creation
            await page.keyboard.type('```javascript ');
            // Click to select
            await page.click('div[data-kg-card="codeblock"]');
            // Click to edit
            await page.click('div[data-kg-card="codeblock"]');

            expect(await page.locator('[data-kg-card-editing="true"]')).not.toBeNull();
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

            expect(await page.locator('[data-kg-card-editing="true"]')).not.toBeNull();

            await page.click('p');
            expect(await page.locator('[data-kg-card-editing="false"]'));
        });

        test('clicking outside the editor and then on a card focuses the editor', async function () {
            await focusEditor(page);
            await page.keyboard.type('```javascript ');
            await page.keyboard.type('import React from "react"');

            const title = page.getByTestId('post-title');
            await title.click();
            let titleHasFocus = await title.evaluate(node => document.activeElement === node);
            expect(titleHasFocus).toEqual(true);

            await page.click('div[data-kg-card="codeblock"]');
            const editor = await page.locator('div.kg-prose').first();
            let editorHasFocus = await editor.evaluate(node => document.activeElement === node);
            expect(editorHasFocus).toEqual(true);
        });

        test('clicking outside the empty edit mode card removes the card', async function () {
            await focusEditor(page);
            await page.keyboard.type('```javascript ');

            expect(await page.locator('[data-kg-card-editing="true"]')).not.toBeNull();

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
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="codeblock">
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="codeblock">
                    </div>
                </div>
            `, {ignoreCardContents: true, ignoreCardToolbarContents: true});

            // Select the python card
            await page.click('div[data-kg-card="codeblock"]');
            // Click the selected card again to enter editing mode
            await page.click('div[data-kg-card-selected="true"]');

            // Now the first card should be editing and the second card should not be
            await expect(await page.locator('[data-kg-card-editing="true"]')).not.toBeNull();
            await expect(await page.locator('[data-kg-card-editing="false"]')).not.toBeNull();

            // Click the card that's not currently editing (second card)
            await page.click('div[data-kg-card-editing="false"]');
            // Now neither card should be editing
            await expect(await page.locator('[data-kg-card-editing="true"]')).toHaveCount(0);

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="codeblock">
                        <div>
                            <pre><code class="language-python">import pandas as pd</code></pre>
                            <div><span>python</span></div>
                        </div>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="codeblock">
                        <div>
                            <pre><code class="language-javascript">import React from "react"</code></pre>
                            <div><span>javascript</span></div>
                        </div>
                    <figcaption></figcaption>
                    <div data-kg-card-toolbar="button"></div>
                    </div>
                </div>

            `, {ignoreCardToolbarContents: true, ignoreCardCaptionContents: true});
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
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="codeblock">
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

        //test.fixme('lazy click puts card in edit mode');
        test('clicking in the space between cards selects the card under it', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('```javascript ');
            await page.waitForSelector('[data-kg-card="codeblock"] .cm-editor');
            await page.keyboard.type('import React from "react"');
            await page.keyboard.press('Meta+Enter');
            await page.keyboard.press('ArrowUp');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="codeblock">
                    </div>
                </div>
            `, {ignoreCardContents: true});

            await page.mouse.click(275, 275);

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="codeblock">
                    </div>
                </div>
            `, {ignoreCardContents: true});
        });
    });

    test.describe('LEFT', function () {
        // deselects card and moves cursor onto paragraph
        test('with selected card after paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('---');
            await page.click('hr');

            await assertHTML(page, html`
                <p><br></p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowLeft');

            await assertHTML(page, html`
                <p><br></p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
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
            await page.keyboard.type('---');
            await page.keyboard.type('---');

            await page.keyboard.press('ArrowLeft');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowLeft');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);
        });

        // triggers "caret left at top" prop fn
        //test.fixme('when selected card is first section');
    });

    test.describe('RIGHT', function () {
        test('with selected card before paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.click('hr');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowRight');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
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
            await page.keyboard.type('---');
            await page.keyboard.type('---');
            await page.click('hr');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowRight');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('ArrowRight');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
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

    test.describe('UP', function () {
        // moves caret to end of paragraph
        test('with selected card after paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('First line');
            await page.keyboard.down('Shift');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Shift');
            await page.keyboard.type('Second line');
            await page.keyboard.press('Enter');
            await insertCard(page, {cardName: 'divider'});

            // sanity check
            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">First line</span>
                    <br />
                    <span data-lexical-text="true">Second line</span>
                </p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);

            await page.click('[data-kg-card="horizontalrule"]');
            await expect(await page.locator('[data-kg-card-selected="true"]')).not.toBeNull();

            await page.keyboard.press('ArrowUp');

            // caret is at end of second line of paragraph
            await assertSelection(page, {
                anchorOffset: 11,
                anchorPath: [0, 2, 0],
                focusOffset: 11,
                focusPath: [0, 2, 0]
            });

            // card is no longer selected
            await expect(await page.locator('[data-kg-card-selected="true"]')).toHaveCount(0);
        });

        // selects the previous card
        test('with selected card after card', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('---');
            await page.click('[data-lexical-decorator]:nth-of-type(2)');

            // sanity check, second card is selected
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);

            await page.keyboard.press('ArrowUp');

            // first card is now selected
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);
        });

        // selects the card once caret reaches top of paragraph
        test('moving through paragraph to card', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await expect(await page.locator('[data-kg-card="horizontalrule"]')).toBeVisible();
            // three lines of text - paste it because keyboard.type is slow for long text
            const text = 'Chislic bacon flank andouille picanha turkey porchetta chuck venison shank. Beef sirloin bresaola, meatball hamburger pork belly shankle. Frankfurter brisket t-bone alcatra porchetta tongue flank pork chop kevin picanha prosciutto meatball.';
            await pasteText(page, text);

            await expect(await page.getByText(text)).toBeVisible();

            // place cursor at beginning of third line
            const textLocator = await page.locator('[data-lexical-editor] > p');
            const pRect = await textLocator.boundingBox();
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

            await expect(await page.locator('[data-kg-card-selected="true"]')).toHaveCount(0);
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
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
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
            await page.keyboard.type('---');
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
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
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

    test.describe('DOWN', function () {
        // moves caret to beginning of paragraph
        test('with selected card before paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('First line');
            await page.keyboard.down('Shift');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Shift');
            await page.keyboard.type('Second line');

            await page.click('[data-lexical-decorator]');

            // sanity check
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
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
                anchorPath: [1, 0, 0],
                focusOffset: 0,
                focusPath: [1, 0, 0]
            });

            // card is no longer selected
            await expect(await page.locator('[data-kg-card-selected="true"]')).toHaveCount(0);
        });

        // selects the next card
        test('with selected card before card', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('---');
            await page.click('[data-lexical-decorator]');

            // sanity check, first card is selected
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);

            await page.keyboard.press('ArrowDown');

            // first card is now selected
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
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
            await page.keyboard.type('---');

            // place cursor at beginning of first line
            const pHandle = await page.locator('[data-lexical-editor] > p').nth(0);
            const pRect = await pHandle.boundingBox();
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
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
                </div>
                <p><br /></p>
            `);
        });

        test('with selected card at end of document', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.press('Backspace');

            // sanity check
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
            `);

            await page.keyboard.press('ArrowDown');

            // should create a new paragraph and move cursor to it
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br /></p>
            `);

            await assertSelection(page, {
                anchorPath: [1],
                anchorOffset: 0,
                focusPath: [1],
                focusOffset: 0
            });
        });
    });

    test.describe('ENTER', function () {
        test('with selected card creates paragraph after and moves selection', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.click('hr');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('Enter');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
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

    test.describe('BACKSPACE', function () {
        // deletes card and puts cursor at end of previous paragraph
        test('with selected card after paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('Testing');
            await page.keyboard.press('Enter');
            await page.keyboard.type('---');
            await page.click('hr');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
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
            await page.keyboard.type('---');
            await page.keyboard.type('---');
            await page.click('[data-lexical-decorator]:nth-of-type(2) hr');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);

            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);
        });

        test('with selected card as first section followed by paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
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
            await page.keyboard.type('---');
            await page.keyboard.type('---');
            await page.click('hr');
            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);
        });

        test('with selected card as only node', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.press('Backspace');
            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <p><br></p>
            `);
        });

        // deletes empty paragraph, selects card
        test('on empty paragraph after card', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
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
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
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
            await page.keyboard.type('---');
            await page.keyboard.type('Second paragraph');
            for (let i = 0; i < 'Second paragraph'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }
            // await page.keyboard.press('Control+KeyA');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">First paragraph</span></p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p dir="ltr"><span data-lexical-text="true">Second paragraph</span></p>
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
                <p dir="ltr"><span data-lexical-text="true">Second paragraph</span></p>
            `);

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1, 0, 0],
                focusOffset: 0,
                focusPath: [1, 0, 0]
            });
        });

        test('at start of list after a card', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('* Test');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <ul>
                    <li value="1" dir="ltr"><span data-lexical-text="true">Test</span></li>
                </ul>
            `);

            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p dir="ltr"><span data-lexical-text="true">Test</span></p>
            `);
        });

        test('at start of a quote block after a card', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('> Test');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <blockquote dir="ltr"><span data-lexical-text="true">Test</span></blockquote>
            `);

            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p dir="ltr"><span data-lexical-text="true">Test</span></p>
            `);
        });

        test('at start of an aside after a card', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('> Test');
            await page.keyboard.press('Control+q');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <aside dir="ltr"><span data-lexical-text="true">Test</span></aside>
            `);

            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('Backspace');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p dir="ltr"><span data-lexical-text="true">Test</span></p>
            `);
        });
    });

    test.describe('DELETE', function () {
        test('with selected card before paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('Testing');
            await page.click('hr');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
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
            await page.keyboard.type('---');
            await page.keyboard.type('---');
            await page.click('hr');

            await page.keyboard.press('Delete');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p><br></p>
            `);
        });

        test('with selected card as only node', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.press('Backspace');
            await page.keyboard.press('Delete');

            await assertHTML(page, html`
                <p><br></p>
            `);
        });

        // deletes paragraph and selects card
        test('on empty paragraph before card', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('---');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.press('ArrowUp');

            await assertHTML(page, html`
                <p><br></p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
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
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
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
            await page.keyboard.type('---');
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
                <p dir="ltr"><span data-lexical-text="true">Second paragraph</span></p>
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

        test('at start of formatted text in paragraph before card', async function () {
            await focusEditor(page);
            await page.keyboard.type('Before ');
            await page.keyboard.press(`${ctrlOrCmd()}+i`);
            await page.keyboard.type('italic');
            await page.keyboard.press(`${ctrlOrCmd()}+i`);
            await page.keyboard.type(' after');
            await page.keyboard.press('Enter');
            await page.keyboard.type('---');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Before </span>
                    <em data-lexical-text="true">italic</em>
                    <span data-lexical-text="true"> after</span>
                </p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                    </div>
                </div>
                <p><br></p>
            `, {ignoreCardContents: true});

            await page.locator('em').click({position: {x: 0, y: 0}});

            await assertSelection(page, {
                anchorOffset: 7,
                anchorPath: [0, 0, 0],
                focusOffset: 7,
                focusPath: [0, 0, 0]
            });

            await page.keyboard.press('Delete');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Before </span>
                    <em data-lexical-text="true">talic</em>
                    <span data-lexical-text="true"> after</span>
                </p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                    </div>
                </div>
                <p><br></p>
            `, {ignoreCardContents: true});
        });
    });

    // this behaviour changes between mac and windows
    test.describe.skip('CMD+BACKSPACE', function () {
        test('on an populated paragraph after a card', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('Some content');

            await page.keyboard.press(`${ctrlOrCmd()}+Backspace`);

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
            `);
        });

        test('on the first line of a multi-line paragraph after a card', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('Some content');
            await page.keyboard.press('Shift+Enter');
            await page.keyboard.press('Shift+Enter');
            await page.keyboard.type('Some more content');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.press('ArrowUp');

            await page.keyboard.press(`${ctrlOrCmd()}+Backspace`);

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                        <hr>
                    </div>
                </div>
                <p dir="ltr">
                    <br />
                    <br />
                    <span data-lexical-text="true">Some more content</span>
                </p>
            `);
        });
    });

    test.describe('CMD+ENTER', function () {
        test('with a non-edit-mode card selected', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.click('hr');

            await expect(await page.locator('[data-kg-card-selected="true"]')).not.toBeNull();

            await page.keyboard.press('Meta+Enter');

            // card does not enter edit mode
            await expect(await page.locator('[data-kg-card-selected="true"]')).not.toBeNull();
            await expect(await page.locator('[data-kg-card-editing="false"]')).not.toBeNull();
        });

        test('with an edit-mode card selected', async function () {
            await focusEditor(page);
            await page.keyboard.type('``` ');
            await page.waitForSelector('[data-kg-card="codeblock"] .cm-editor');
            await page.keyboard.type('import React from "react"');
            await page.click('[data-kg-card="codeblock"]');

            expect(await page.locator('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.locator('[data-kg-card-editing="true"]')).not.toBeNull();

            await page.keyboard.press('Meta+Enter');

            // card exits edit mode
            expect(await page.locator('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.locator('[data-kg-card-editing="false"]')).not.toBeNull();

            await page.keyboard.press('Meta+Enter');

            // card enters edit mode
            expect(await page.locator('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.locator('[data-kg-card-editing="true"]')).not.toBeNull();
        });

        test('cursor position when deselecting empty card with nested editor', async function () {
            // Focus/cursor position was not correct when a card with a nested editor was deselected+removed,
            // an extra reset was occurring putting the cursor at the start of the document.
            // See https://github.com/TryGhost/Product/issues/3430
            await focusEditor(page);
            await page.keyboard.type('Testing');
            await page.keyboard.press('Enter');
            await insertCard(page, {cardName: 'product'});
            await page.keyboard.press('Meta+Enter');

            // focus is on blank paragraph that's left after empty card is removed
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [1],
                focusOffset: 0,
                focusPath: [1]
            });
        });
    });

    test.describe('ESCAPE', function () {
        test('with an edit mode card that is not empty', async function () {
            await focusEditor(page);
            await page.keyboard.type('``` ');
            await page.waitForSelector('[data-kg-card="codeblock"]');
            await page.keyboard.type('import React from "react"');

            expect(await page.locator('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.locator('[data-kg-card-editing="true"]')).not.toBeNull();

            await page.keyboard.press('Escape');

            // card exits edit mode
            expect(await page.locator('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.locator('[data-kg-card-editing="false"]')).not.toBeNull();

            // card is still able to re-enter edit mode with CMD+ENTER
            await page.keyboard.press('Meta+Enter');

            expect(await page.locator('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.locator('[data-kg-card-editing="true"]')).not.toBeNull();
        });

        test('with an edit mode card that is empty', async function () {
            await focusEditor(page);
            await page.keyboard.type('``` ');
            await page.waitForSelector('[data-kg-card="codeblock"]');

            expect(await page.locator('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.locator('[data-kg-card-editing="true"]')).not.toBeNull();

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

            expect(await page.locator('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.locator('[data-kg-card-editing="true"]')).not.toBeNull();

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
            await page.keyboard.type('---');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.type('``` ');
            await page.waitForSelector('[data-kg-card="codeblock"]');

            expect(await page.locator('[data-kg-card-selected="true"]')).not.toBeNull();
            expect(await page.locator('[data-kg-card-editing="true"]')).not.toBeNull();

            await page.keyboard.press('Escape');

            // card is removed leaving the existing card
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div
                        data-kg-card-editing="false"
                        data-kg-card-selected="true"
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

    test.describe('SELECTION', function () {
        test('shift+down does not put card in selected state', async function () {
            await focusEditor(page);
            await page.keyboard.type('First');
            await page.keyboard.press('Enter');
            await page.keyboard.type('---');
            await page.keyboard.type('Second');
            await page.keyboard.press('ArrowUp');
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

            // offsets are based on the root node offset
            await assertSelection(page, {
                anchorPath: [],
                anchorOffset: 0,
                focusPath: [],
                focusOffset: 2
            });
            // this is a range selection, so the card is not explicitly selected
            await expect(page.locator('[data-kg-card-selected="true"]')).not.toBeVisible();
        });

        test('shift+up does not put card in selected state', async function () {
            await focusEditor(page);
            await page.keyboard.type('First');
            await page.keyboard.press('Enter');
            await page.keyboard.type('---');
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

            // offsets are based on the root node offset
            await assertSelection(page, {
                anchorPath: [],
                anchorOffset: 3,
                focusPath: [],
                focusOffset: 1
            });
            // this is a range selection, so the card is not explicitly selected
            await expect(page.locator('[data-kg-card-selected="true"]')).not.toBeVisible();
        });
    });

    test.describe('CMD+UP', function () {
        test('with selected card and plain text at top', async function () {
            await focusEditor(page);
            await page.keyboard.type('First');
            await page.keyboard.press('Enter');
            await page.keyboard.type('---');
            await page.keyboard.type('Second');
            await page.keyboard.press('ArrowUp');

            await page.keyboard.press('Meta+ArrowUp');

            await assertSelection(page, {
                anchorPath: [0, 0, 0],
                anchorOffset: 0,
                focusPath: [0, 0, 0],
                focusOffset: 0
            });
        });

        test('with selected card and card at top', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('---');
            await page.keyboard.press('ArrowUp');

            await page.keyboard.press('Meta+ArrowUp');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div
                        data-kg-card-editing="false"
                        data-kg-card-selected="true"
                        data-kg-card="horizontalrule"
                    >
                        <hr />
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div
                        data-kg-card-editing="false"
                        data-kg-card-selected="false"
                        data-kg-card="horizontalrule"
                    >
                        <hr />
                    </div>
                </div>
                <p><br /></p>
            `);
        });

        test('with caret in text and card at top', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('First');
            await page.keyboard.press('Enter');
            await page.keyboard.type('Second');

            await page.keyboard.press('Meta+ArrowUp');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div
                        data-kg-card-editing="false"
                        data-kg-card-selected="true"
                        data-kg-card="horizontalrule"
                    >
                        <hr />
                    </div>
                </div>
                <p dir="ltr"><span data-lexical-text="true">First</span></p>
                <p dir="ltr"><span data-lexical-text="true">Second</span></p>
            `);
        });
    });

    test.describe('CMD+DOWN', function () {
        test('with selected card and plain text at bottom', async function () {
            await focusEditor(page);
            await page.keyboard.type('First');
            await page.keyboard.press('Enter');
            await page.keyboard.type('---');
            await page.keyboard.type('Second');
            await page.keyboard.press('ArrowUp');

            await page.keyboard.press('Meta+ArrowDown');

            await assertSelection(page, {
                anchorPath: [2, 0, 0],
                anchorOffset: 6,
                focusPath: [2, 0, 0],
                focusOffset: 6
            });
        });

        test('with selected card and card at bottom', async function () {
            await focusEditor(page);
            await page.keyboard.type('---');
            await page.keyboard.type('---');
            await page.keyboard.press('Backspace');
            await page.keyboard.press('ArrowUp');

            await page.keyboard.press('Meta+ArrowDown');

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div
                        data-kg-card-editing="false"
                        data-kg-card-selected="false"
                        data-kg-card="horizontalrule"
                    >
                        <hr />
                    </div>
                </div>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div
                        data-kg-card-editing="false"
                        data-kg-card-selected="true"
                        data-kg-card="horizontalrule"
                    >
                        <hr />
                    </div>
                </div>
            `);
        });

        test('with caret in text and card at bottom', async function () {
            await focusEditor(page);
            await page.keyboard.type('First');
            await page.keyboard.press('Enter');
            await page.keyboard.type('Second');
            await page.keyboard.press('Enter');
            await page.keyboard.type('---');
            await page.keyboard.press('Backspace');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.press('ArrowUp');

            await page.keyboard.press('Meta+ArrowDown');

            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">First</span></p>
                <p dir="ltr"><span data-lexical-text="true">Second</span></p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div
                        data-kg-card-editing="false"
                        data-kg-card-selected="true"
                        data-kg-card="horizontalrule"
                    >
                        <hr />
                    </div>
                </div>
            `);
        });
    });

    test.describe('captions', function () {
        // we had a bug where the caption would steal focus when typing in any
        // other card, resulting in the typed text being inserted into the caption
        test('do not steal focus when not selected', async function () {
            await focusEditor(page);
            await page.keyboard.type('/image https://example.com/image.jpg');
            await page.waitForSelector('[data-kg-card-menu-item="Image"][data-kg-cardmenu-selected="true"]');
            await page.keyboard.press('Enter');
            await page.waitForSelector('[data-kg-card="image"]');
            await page.keyboard.type('Caption value');

            await expect(page.locator('[data-kg-card="image"] figcaption [data-kg="editor"]')).toHaveText('Caption value');

            await page.keyboard.press('Meta+Enter');
            await page.keyboard.type('``` ');
            await page.waitForSelector('[data-kg-card="codeblock"]');
            await page.keyboard.type('Code content');

            await expect(page.locator('[data-kg-card="image"] figcaption [data-kg="editor"]')).toHaveText('Caption value');
            await expect(page.locator('[data-kg-card="codeblock"] .cm-line')).toHaveText('Code content');
        });
    });

    test.describe('inner editors', function () {
        test('can use the delete key to remove text', async function () {
            await focusEditor(page);
            await page.keyboard.type('/image https://example.com/image.jpg');
            await page.waitForSelector('[data-kg-card-menu-item="Image"][data-kg-cardmenu-selected="true"]');
            await page.keyboard.press('Enter');
            await page.waitForSelector('[data-kg-card="image"]');
            await page.keyboard.type('Caption value');
            await page.keyboard.press('ArrowLeft');
            // await page.keyboard.press('Fn+Backspace'); // note: this is the delete key for macs, but playwright doesn't recognize "Fn" even when running on a mac :(
            await page.keyboard.press('Delete');

            await expect(page.locator('[data-kg-card="image"] figcaption [data-kg="editor"]')).toHaveText('Caption valu');
        });

        test.describe('codemirror', function () {
            // Skipped because CodeMirror does not pick up the copy/paste properly inside Playwright - manual testing is working
            test.skip('can copy/paste', async function () {
                const ctrlOrCmdKey = ctrlOrCmd();

                await focusEditor(page);
                await insertCard(page, {cardName: 'html'});

                // waiting for html editor
                await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();

                await page.keyboard.type('Testing', {delay: 10});
                await page.waitForTimeout(100);
                await page.keyboard.press(`${ctrlOrCmdKey}+KeyA`, {delay: 10});
                await page.waitForTimeout(100);
                await page.keyboard.press(`${ctrlOrCmdKey}+KeyC`, {delay: 10});
                await page.waitForTimeout(100);
                await page.keyboard.press(`${ctrlOrCmdKey}+KeyV`, {delay: 10});
                await page.waitForTimeout(100);
                await page.keyboard.press(`${ctrlOrCmdKey}+KeyV`, {delay: 10});
                await page.waitForTimeout(100);

                await assertHTML(page, html`
                    <div data-lexical-decorator="true" contenteditable="false">
                        <div><svg></svg></div>
                        <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="html">
                            <div>
                                <div>
                                    <div>
                                        <div aria-live="polite"></div>
                                        <div tabindex="-1">
                                            <div aria-hidden="true">
                                                <div>
                                                    <div>9</div>
                                                    <div>1</div>
                                                </div>
                                            </div>
                                            <div spellcheck="false" autocorrect="off" autocapitalize="off" translate="no"
                                                contenteditable="true" role="textbox" aria-multiline="true" data-language="html">
                                                <div>Testing</div>
                                            </div>
                                            <div aria-hidden="true">
                                                <div></div>
                                            </div>
                                            <div aria-hidden="true"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p><br /></p>
                `, {ignoreCardContents: false});
            });
        });
    });
});
