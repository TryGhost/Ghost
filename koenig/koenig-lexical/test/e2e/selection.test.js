import {beforeAll, afterAll, beforeEach, describe, test} from 'vitest';
import {startApp, initialize, focusEditor, assertSelection, dragMouse, assertHTML, html} from '../utils/e2e';

describe('Selection behaviour', async () => {
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

    // TODO: skipped because Playwright doesn't fire the `click` event when the
    // mouse is released after a drag meaning it wasn't triggering the buggy behaviour.
    // Unskip when this is fixed: https://github.com/microsoft/playwright/issues/20717
    test.skip('can create range selection covering a card', async function () {
        await focusEditor(page);
        await page.keyboard.type('First paragraph');
        await page.keyboard.press('Enter');
        await page.keyboard.type('--- ');
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
        await page.keyboard.type('--- ');
        await page.keyboard.type('Second paragraph');

        const firstPBoundingBox = await page.locator('p').nth(0).boundingBox();
        const secondPBoundingBox = await page.locator('p').nth(1).boundingBox();

        await dragMouse(page, firstPBoundingBox, secondPBoundingBox, 'start', 'end');

        await assertHTML(page, html`
            <p dir="ltr"><span data-lexical-text="true">First paragraph</span></p>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="horizontalrule">
                    <hr>
                </div>
            </div>
            <p><span data-lexical-text="true">Second paragraph</span></p>
        `);
    });
});
