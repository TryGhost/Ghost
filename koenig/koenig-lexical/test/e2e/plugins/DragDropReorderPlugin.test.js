import path from 'path';
import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, dragMouse, focusEditor, html, initialize, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

describe('Drag Drop Reorder Plugin', async function () {
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

        await page.keyboard.type('/divider');
        await page.keyboard.press('Enter');

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
        const paragraphBBox = await page.locator('p').boundingBox();

        await dragMouse(page, imageBBox, paragraphBBox, 'start', 'start', true, 100, 100);

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

        await page.keyboard.type('/divider');
        await page.waitForSelector('[data-kg-card-menu-item="Divider"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');

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

        await page.keyboard.type('/divider');
        await page.keyboard.press('Enter');

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
        const paragraphBBox = await page.locator('p').boundingBox();
        const toBBox = {
            x: paragraphBBox.x,
            y: paragraphBBox.y + paragraphBBox.height + 45,
            width: paragraphBBox.width,
            height: paragraphBBox.height
        };

        await dragMouse(page, imageBBox, toBBox, 'start', 'start', true, 100, 100);

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

        await page.keyboard.type('/divider');
        await page.keyboard.press('Enter');

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
        const paragraphBBox = await page.locator('p').boundingBox();
        const toBBox = {
            x: paragraphBBox.x,
            y: paragraphBBox.y + paragraphBBox.height + 45,
            width: paragraphBBox.width,
            height: paragraphBBox.height
        };

        await dragMouse(page, imageBBox, toBBox, 'start', 'start', false, 100, 100);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="image"></div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"></div>
            </div>
            <p dir="ltr"><span data-lexical-text="true">This is some text</span></p>
        `, {ignoreCardContents: true});

        const indicator = await page.locator('#koenig-drag-drop-indicator');
        await expect(await indicator).toBeVisible();
    });
});
