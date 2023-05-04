import {assertHTML, assertSelection, focusEditor, html, initialize} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Title behaviour (ExternalControlPlugin)', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test.describe('in title', function () {
        test.describe('ENTER', function () {
            test('moves cursor to blank editor', async function ({page}) {
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

            test('adds paragraph and moves cursor to populated editor', async function ({page}) {
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

        test.describe('TAB', function () {
            test('moves cursor to blank editor', async function ({page}) {
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

        test.describe('ARROW RIGHT', function () {
            test('moves cursor to editor when title is blank', async function ({page}) {
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

            test('moves cursor to editor when cursor at end of title', async function ({page}) {
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

        test.describe('ARROW DOWN', function () {
            test('moves cursor to editor when title is blank', async function ({page}) {
                await page.getByTestId('post-title').click();
                await page.keyboard.press('ArrowDown');

                await assertSelection(page, {
                    anchorOffset: 0,
                    anchorPath: [0],
                    focusOffset: 0,
                    focusPath: [0]
                });
            });

            test('moves cursor to editor when cursor at end of title', async function ({page}) {
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

            test('selects card if that is first section in doc', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('--- ');

                await page.getByTestId('post-title').click();
                await page.keyboard.press('ArrowDown');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(false);

                // card is selected
                await assertHTML(page, html`
                    <div data-lexical-decorator="true" contenteditable="false">
                       <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="horizontalrule"><hr /></div>
                    </div>
                    <p><br /></p>
                `);

                // editor has focus so it's possible to continue typing
                await page.keyboard.press('Enter');
                await page.keyboard.type('Testing');

                await assertHTML(page, html`
                    <div data-lexical-decorator="true" contenteditable="false">
                       <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                    </div>
                    <p dir="ltr"><span data-lexical-text="true">Testing</span></p>
                    <p><br /></p>
                `);
            });
        });
    });

    test.describe('in editor', function () {
        test.describe('ARROW UP', function () {
            test('at start of paragraph doc moves cursor to title', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.press('ArrowUp');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(true);
            });

            test('at start of list at top of doc moves to title', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('- ');
                await page.keyboard.press('ArrowUp');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(true);
            });

            test('with selected card at start of doc moves to title', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('--- ');
                await page.keyboard.press('ArrowUp');
                await page.keyboard.press('ArrowUp');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(true);

                // card is not selected
                await assertHTML(page, html`
                    <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                    </div>
                    <p><br /></p>
                `);
            });

            test('with non-collapsed selection at start of doc does not move to title', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('Test');
                await page.keyboard.press('Shift+ArrowLeft');
                await page.keyboard.press('Shift+ArrowLeft');
                await page.keyboard.press('Shift+ArrowLeft');
                await page.keyboard.press('Shift+ArrowLeft');

                await assertSelection(page, {
                    anchorOffset: 4,
                    anchorPath: [0,0,0],
                    focusOffset: 0,
                    focusPath: [0,0,0]
                });

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(false);

                await page.keyboard.press('ArrowUp');

                titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(false);

                await assertSelection(page, {
                    anchorOffset: 0,
                    anchorPath: [0,0,0],
                    focusOffset: 0,
                    focusPath: [0,0,0]
                });
            });

            test('at middle of doc does not move to title', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('One');
                await page.keyboard.press('Enter');
                await page.keyboard.press('ArrowUp');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(false);
            });

            test('with selected card in middle of doc does not move to title', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('One');
                await page.keyboard.press('Enter');
                await page.keyboard.type('--- ');
                await page.keyboard.press('ArrowUp');
                await page.keyboard.press('ArrowUp');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(false);
            });
        });

        test.describe('ARROW LEFT', function () {
            test('at start of paragraph doc moves cursor to title', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.press('ArrowLeft');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(true);
            });

            test('at start of list at top of doc moves to title', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('- ');
                await page.keyboard.press('ArrowLeft');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(true);
            });

            test('with selected card at start of doc moves to title', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('--- ');
                await page.keyboard.press('ArrowUp');
                await page.keyboard.press('ArrowLeft');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(true);

                // card is not selected
                await assertHTML(page, html`
                    <div data-lexical-decorator="true" contenteditable="false">
                        <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="horizontalrule"><hr /></div>
                    </div>
                    <p><br /></p>
                `);
            });

            test('with non-collapsed selection at start of doc does not move to title', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('Test');
                await page.keyboard.press('Shift+ArrowLeft');
                await page.keyboard.press('Shift+ArrowLeft');
                await page.keyboard.press('Shift+ArrowLeft');
                await page.keyboard.press('Shift+ArrowLeft');

                await assertSelection(page, {
                    anchorOffset: 4,
                    anchorPath: [0,0,0],
                    focusOffset: 0,
                    focusPath: [0,0,0]
                });

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(false);

                await page.keyboard.press('ArrowLeft');

                titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(false);

                await assertSelection(page, {
                    anchorOffset: 0,
                    anchorPath: [0,0,0],
                    focusOffset: 0,
                    focusPath: [0,0,0]
                });
            });

            test('at middle of doc does not move to title', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('One');
                await page.keyboard.press('Enter');
                await page.keyboard.press('ArrowLeft');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(false);
            });

            test('with selected card in middle of doc does not move to title', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('One');
                await page.keyboard.press('Enter');
                await page.keyboard.type('--- ');
                await page.keyboard.press('ArrowUp');
                await page.keyboard.press('ArrowLeft');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(false);
            });
        });

        test.describe('SHIFT+TAB', function () {
            test('moves cursor to title when not dedenting', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('Test');
                await page.keyboard.press('Shift+Tab');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(true);
            });

            test('dedents rather than moving cursor when necessary', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('Test');
                await page.keyboard.press('Tab');
                await page.keyboard.press('Shift+Tab');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(false);

                await assertHTML(page, html`
                    <p dir="ltr"><span data-lexical-text="true">Test</span></p>
                `);
            });

            test('moves cursor to title when card is selected', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('--- ');
                await page.keyboard.press('ArrowUp');
                await page.keyboard.press('Shift+Tab');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(true);
            });

            test('moves cursor to title when a range is selected with no indents', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('Test');
                await page.keyboard.press('Shift+ArrowLeft');
                await page.keyboard.press('Shift+ArrowLeft');
                await page.keyboard.press('Shift+ArrowLeft');
                await page.keyboard.press('Shift+ArrowLeft');
                await page.keyboard.press('Shift+Tab');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(true);
            });

            test('does not move cursor to title if a range selection would outdent something', async function ({page}) {
                await focusEditor(page);
                await page.keyboard.type('Test');
                await page.keyboard.press('Enter');
                await page.keyboard.press('Tab');
                await page.keyboard.type('Test');
                await page.keyboard.press('Shift+ArrowUp');
                await page.keyboard.press('Shift+Tab');

                const title = page.getByTestId('post-title');
                let titleHasFocus = await title.evaluate(node => document.activeElement === node);
                expect(titleHasFocus).toEqual(false);

                await assertHTML(page, html`
                    <p dir="ltr"><span data-lexical-text="true">Test</span></p>
                    <p dir="ltr"><span data-lexical-text="true">Test</span></p>
                `);
            });
        });
    });
});
