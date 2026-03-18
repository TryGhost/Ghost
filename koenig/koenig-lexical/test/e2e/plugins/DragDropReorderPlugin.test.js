import path from 'path';
import {assertHTML, dragMouse, focusEditor, html, initialize, insertCard} from '../../utils/e2e';
import {expect, test} from '@playwright/test';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Drag Drop Reorder Plugin', async function () {
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

    test('can drag and drop a card between two other nodes', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);

        await page.keyboard.type('/image');
        await page.waitForSelector('[data-kg-card-menu-item="Image"][data-kg-cardmenu-selected="true"]');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.keyboard.press('Enter')
        ]);
        await fileChooser.setFiles([filePath]);

        await page.waitForSelector('[data-kg-card="image"] [data-testid="image-card-populated"]');
        await page.keyboard.press('ArrowDown');

        await insertDivider(page);

        await page.keyboard.type('This is some text');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="image"></div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"></div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">This is some text</span></p>
        `, {ignoreCardContents: true});

        const imageBBox = await page.locator('[data-kg-card="image"]').boundingBox();
        // :not(figure p) avoids the p element that is the nested editor for the image card caption
        const paragraphBBox = await page.locator('p:not(figure p)').boundingBox();

        await dragMouse(page, imageBBox, paragraphBBox, 'start', 'start', true, 100, 100);

        // Click on the paragraph to deselect the card after drop
        // (Chrome for Testing keeps the card selected after drag & drop unlike old Chromium)
        await page.click('p:not(figure p)');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"></div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="image"></div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">This is some text</span></p>
        `, {ignoreCardContents: true});
    });

    test('can drag and drop a card at the top of the editor', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);

        await insertDivider(page);

        await page.keyboard.type('This is some text');
        await page.keyboard.press('Enter');

        await page.keyboard.type('/image');
        await page.waitForSelector('[data-kg-card-menu-item="Image"][data-kg-cardmenu-selected="true"]');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.keyboard.press('Enter')
        ]);
        await fileChooser.setFiles([filePath]);

        await page.waitForSelector('[data-kg-card="image"] [data-testid="image-card-populated"]');
        await page.keyboard.press('ArrowDown');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"></div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">This is some text</span></p>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="image"></div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});

        const imageBBox = await page.locator('[data-kg-card="image"]').boundingBox();
        const dividerBBox = await page.locator('hr').boundingBox();

        await dragMouse(page, imageBBox, dividerBBox, 'start', 'start', true, 100, 100);

        // Click on the paragraph to deselect the card after drop
        // (Chrome for Testing keeps the card selected after drag & drop unlike old Chromium)
        await page.click('p:not(figure p)');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="image"></div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"></div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">This is some text</span></p>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can drag and drop a card at the bottom of the editor', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);

        await page.keyboard.type('/image');
        await page.waitForSelector('[data-kg-card-menu-item="Image"][data-kg-cardmenu-selected="true"]');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.keyboard.press('Enter')
        ]);
        await fileChooser.setFiles([filePath]);

        await page.waitForSelector('[data-kg-card="image"] [data-testid="image-card-populated"]');
        await page.keyboard.press('ArrowDown');

        await insertDivider(page);

        await page.keyboard.type('This is some text', {delay: 100}); // type slower to imitate user
        await expect(await page.getByText('This is some text')).toBeVisible();

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="image"></div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"></div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">This is some text</span></p>
        `, {ignoreCardContents: true});

        const imageBBox = await page.locator('[data-kg-card="image"]').boundingBox();

        await twoPhaseDragToBottom(page, imageBBox);
        await page.waitForTimeout(100);
        await page.mouse.up();

        // Click on the paragraph to deselect the card after drop
        // (Chrome for Testing keeps the card selected after drag & drop unlike old Chromium)
        await page.click('p:not(figure p)');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"></div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">This is some text</span></p>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="image"></div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('can display placeholder element while hovering between nodes', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);

        await page.keyboard.type('/image');
        await page.waitForSelector('[data-kg-card-menu-item="Image"][data-kg-cardmenu-selected="true"]');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.keyboard.press('Enter')
        ]);
        await fileChooser.setFiles([filePath]);

        await page.waitForSelector('[data-kg-card="image"] [data-testid="image-card-populated"]');
        await page.keyboard.press('ArrowDown');

        await insertDivider(page);

        await page.keyboard.type('This is some text');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="image"></div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"></div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">This is some text</span></p>
        `, {ignoreCardContents: true});

        const imageBBox = await page.locator('[data-kg-card="image"]').boundingBox();

        await twoPhaseDragToBottom(page, imageBBox);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="image"></div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"></div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">This is some text</span></p>
        `, {ignoreCardContents: true});

        const indicator = await page.locator('#koenig-drag-drop-indicator');
        await expect(await indicator).toBeVisible();

        // Release the mouse to clean up drag state
        await page.mouse.up();
    });
});

async function insertDivider(page) {
    await insertCard(page, {cardName: 'divider'});
}

// Two-phase drag: move partway first, wait for caption and CSS transitions
// to settle, then measure paragraph's actual position and move into its
// bottom half. A single fast drag races against the 250ms CSS transition
// that shifts the paragraph during drag. Leaves the mouse held down so
// the caller can mouse.up() (for drop tests) or assert mid-drag state.
async function twoPhaseDragToBottom(page, imageBBox) {
    await page.mouse.move(imageBBox.x, imageBBox.y);
    await page.mouse.down();

    // Move past the HR card to trigger the drop indicator and transforms
    const hrBBox = await page.locator('hr').boundingBox();
    await page.mouse.move(imageBBox.x, hrBBox.y + hrBBox.height, {steps: 50});

    // Wait for caption appearance and CSS transitions to settle
    await page.waitForTimeout(300);

    // Measure paragraph's actual visual position (includes caption shift + transform)
    // :not(figure p) avoids the p element that is the nested editor for the image card caption
    const shiftedParagraphBBox = await page.locator('p:not(figure p)').boundingBox();
    const targetY = shiftedParagraphBBox.y + shiftedParagraphBBox.height * 0.75;
    await page.mouse.move(imageBBox.x, targetY, {steps: 10});
}
