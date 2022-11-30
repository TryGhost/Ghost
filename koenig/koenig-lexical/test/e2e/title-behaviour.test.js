import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {startApp, initialize, focusEditor, assertHTML, html, assertSelection} from '../utils/e2e';

describe('Title behaviour (ExternalControlPlugin)', async () => {
    let app;
    let page;

    beforeAll(async () => {
        ({app, page} = await startApp());
    });

    afterAll(async () => {
        await app.stop();
    });

    beforeEach(async () => {
        await initialize({page});
    });

    describe('ENTER', function () {
        it('moves cursor to blank editor', async function () {
            await page.getByTestId('post-title').click();
            await page.keyboard.press('Enter');

            // selection is on editor
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });

            // no extra paragraph created
            await assertHTML(page, html`
                <p><br /></p>
            `);
        });

        it('adds paragraph and moves cursor to populated editor', async function () {
            await focusEditor(page);
            await page.keyboard.type('Populated editor');

            await page.getByTestId('post-title').click();
            await page.keyboard.press('Enter');

            // selection is at start of editor
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });

            // extra paragraph inserted
            await assertHTML(page, html`
                <p><br /></p>
                <p dir="ltr"><span data-lexical-text="true">Populated editor</span></p>
            `);
        });
    });

    describe('TAB', function () {
        it('moves cursor to blank editor', async function () {
            await page.getByTestId('post-title').click();
            await page.keyboard.press('Tab');

            // selection is on editor
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });

            // no extra paragraph created
            await assertHTML(page, html`
                <p><br /></p>
            `);
        });
    });

    describe('ARROW RIGHT', function () {
        it('moves cursor to editor when title is blank', async function () {
            await page.getByTestId('post-title').click();
            await page.keyboard.press('ArrowRight');

            // selection is on editor
            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });

            // no extra paragraph created
            await assertHTML(page, html`
                <p><br /></p>
            `);
        });

        it('moves cursor to editor when cursor at end of title', async function () {
            await page.getByTestId('post-title').click();
            await page.keyboard.type('Populated title');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowRight');

            const title = page.getByTestId('post-title');
            let titleHasFocus = await title.evaluate(node => document.activeElement === node);
            expect(titleHasFocus).toEqual(true);

            await page.keyboard.press('ArrowRight');

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });

            titleHasFocus = await title.evaluate(node => document.activeElement === node);
            expect(titleHasFocus).toEqual(false);
        });
    });

    describe('ARROW DOWN', function () {
        it('moves cursor to editor when title is blank', async function () {
            await page.getByTestId('post-title').click();
            await page.keyboard.press('ArrowDown');

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });
        });

        it('moves cursor to editor when cursor at end of title', async function () {
            await page.getByTestId('post-title').click();
            await page.keyboard.type('Populated title');
            await page.keyboard.press('ArrowLeft');
            // moves cursor to end
            await page.keyboard.press('ArrowDown');

            const title = page.getByTestId('post-title');
            let titleHasFocus = await title.evaluate(node => document.activeElement === node);
            expect(titleHasFocus).toEqual(true);

            // moves cursor to editor
            await page.keyboard.press('ArrowDown');

            await assertSelection(page, {
                anchorOffset: 0,
                anchorPath: [0],
                focusOffset: 0,
                focusPath: [0]
            });

            titleHasFocus = await title.evaluate(node => document.activeElement === node);
            expect(titleHasFocus).toEqual(false);
        });
    });
});
