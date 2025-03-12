import {assertHTML, assertSelection, ctrlOrCmd, dragMouse, focusEditor, html, initialize} from '../utils/e2e';
import {test} from '@playwright/test';

const ctrlOrCmdKey = ctrlOrCmd();

test.describe('Selection behaviour', async () => {
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

    test('can create range selection covering a card', async function () {
        await focusEditor(page);
        await page.keyboard.type('First paragraph');
        await page.keyboard.press('Enter');
        await page.keyboard.type('---');
        await page.keyboard.type('Second paragraph');

        const firstPBoundingBox = await page.locator('p').nth(0).boundingBox();
        const secondPBoundingBox = await page.locator('p').nth(1).boundingBox();

        await dragMouse(page, firstPBoundingBox, secondPBoundingBox, 'start', 'end');

        // make sure we're waiting for any card behaviours to finish
        await page.waitForTimeout(100);

        await assertSelection(page, {
            anchorPath: [0, 0, 0],
            anchorOffset: 0,
            focusPath: [2, 0, 0],
            focusOffset: 16
        });
    });

    test('cards do not show as selected in range selections', async function () {
        await focusEditor(page);
        await page.keyboard.type('First paragraph');
        await page.keyboard.press('Enter');
        await page.keyboard.type('---');
        await page.keyboard.type('Second paragraph');

        const firstPBoundingBox = await page.locator('p').nth(0).boundingBox();
        const secondPBoundingBox = await page.locator('p').nth(1).boundingBox();

        await dragMouse(page, firstPBoundingBox, secondPBoundingBox, 'start', 'end');

        await assertHTML(page, html`
            <p dir="ltr"><span data-lexical-text="true">First paragraph</span></p>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule">
                    <hr>
                </div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">Second paragraph</span></p>
        `);
    });

    test.describe('select all - cmd + a', () => {
        test('works with first and end nodes being paragraphs', async function () {
            await focusEditor(page);
            await page.keyboard.type('First paragraph');
            await page.keyboard.press('Enter');
            await page.keyboard.type('---');
            await page.keyboard.type('Second paragraph');

            await page.keyboard.down(ctrlOrCmdKey);
            await page.keyboard.press('a');
            await page.keyboard.up(ctrlOrCmdKey);

            await assertSelection(page, {
                anchorPath: [0, 0, 0],
                anchorOffset: 0,
                focusPath: [2, 0, 0],
                focusOffset: 16
            });
        });

        test('works with first and end nodes being empty paragraphs', async function () {
            await focusEditor(page);
            await page.keyboard.press('Enter');
            await page.keyboard.type('---');

            await page.keyboard.down(ctrlOrCmdKey);
            await page.keyboard.press('a');
            await page.keyboard.up(ctrlOrCmdKey);

            await assertSelection(page, {
                anchorPath: [0],
                anchorOffset: 0,
                focusPath: [2],
                focusOffset: 0
            });
        });

        // // not sure why this is returning 0 for the focus offset.. this test DOES work, but offset should be 3
        // // TODO: may be related to why we don't see text selection while first and last nodes are cards/decorators?
        // //  if we spy on window.selection() we can see that the selection is correct (offset = 3), just not in the test
        // test.only('works with first and end nodes being cards', async function () {
        //     await focusEditor(page);
        //     await page.keyboard.type('``` ');
        //     await page.keyboard.type('Some code');
        //     await page.keyboard.press('Meta+Enter');

        //     await page.keyboard.type('Some text');
        //     await page.keyboard.press('Enter');

        //     await page.keyboard.type('``` ');
        //     await page.keyboard.type('Some code');
        //     await page.keyboard.press('Meta+Enter');

        //     await page.keyboard.down('Meta');
        //     await page.keyboard.press('a');
        //     await page.keyboard.up('Meta');

        //     await assertSelection(page, {
        //         anchorPath: [],
        //         anchorOffset: 0,
        //         focusPath: [],
        //         focusOffset: 0
        //     });
        // });
    });
});