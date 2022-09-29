import {beforeAll, afterAll, beforeEach, describe, test} from 'vitest';
import {start, initialize, focusEditor, assertHTML, html} from '../utils/e2e';

describe('Card behaviour', async () => {
    let app;
    let page;

    beforeAll(async function () {
        ({app, page} = await start());
    });

    afterAll(async function () {
        await app.stop();
    });

    beforeEach(async function () {
        await initialize({page});
    });

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

    describe('when selected', function () {
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

        test('RIGHT onto paragraph deselects', async function () {
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
        });

        test('LEFT onto paragraph deselects', async function () {
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
        });

        test('ENTER creates paragraph after and moves selection', async function () {
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
        });
    });
});
