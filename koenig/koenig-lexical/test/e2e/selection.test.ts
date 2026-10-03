import {assertHTML, assertSelection, ctrlOrCmd, dragMouse, focusEditor, html, initialize} from '../utils/e2e';
import {expect, test} from '@playwright/test';

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

    test('selects a list up to the boundary before a card without errors', async () => {
        const errors = [];
        const onConsole = message => {
            if (message.type() === 'error') {
                errors.push(message.text());
            }
        };
        page.on('console', onConsole);

        try {
            await focusEditor(page);
            await page.keyboard.type('- Selected text');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await page.keyboard.type('---');
            await expect(page.locator('hr')).toBeVisible();

            // Reproduce the DOM selection made when dragging to a list's edge.
            await page.evaluate(() => {
                const root = window.lexicalEditor.getRootElement();
                const text = root.querySelector('li [data-lexical-text]').firstChild;
                window.getSelection().setBaseAndExtent(text, 0, root, 1);
                document.dispatchEvent(new Event('selectionchange'));
            });

            expect(errors).toEqual([]);
            await assertSelection(page, {
                anchorPath: [0, 0, 0, 0],
                anchorOffset: 0,
                focusPath: [],
                focusOffset: 1
            });
            await page.keyboard.type('Replacement');
            expect(errors).toEqual([]);
            await expect(page.locator('hr')).toBeVisible();
            await expect(page.locator('[data-lexical-editor]').first()).toHaveText('Replacement');
        } finally {
            page.off('console', onConsole);
        }
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

            const modifier = ctrlOrCmd(page);
            await page.keyboard.down(modifier);
            await page.keyboard.press('a');
            await page.keyboard.up(modifier);

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

            const modifier = ctrlOrCmd(page);
            await page.keyboard.down(modifier);
            await page.keyboard.press('a');
            await page.keyboard.up(modifier);

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
