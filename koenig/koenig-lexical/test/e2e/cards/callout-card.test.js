import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, focusEditor, html, initialize, startApp} from '../../utils/e2e';
import {calloutColorPicker} from '../../../src/components/ui/cards/CalloutCard';
import {expect} from '@playwright/test';

describe('Callout Card', async () => {
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

    test('can import serialized callout card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'callout',
                        text: '<p dir="ltr"><span>Hello World</span></p>',
                        hasEmoji: true,
                        emojiValue: '😚',
                        backgroundColor: 'blue'
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });
            const editor = window.lexicalEditor;
            const editorState = editor.parseEditorState(serializedState);
            editor.setEditorState(editorState);
        });

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="callout">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('renders callout card', async function () {
        await focusEditor(page);
        await page.keyboard.type('/callout');
        await page.keyboard.press('Enter');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="callout">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('has settings panel', async function () {
        await focusEditor(page);
        await page.keyboard.type('/callout');
        await page.keyboard.press('Enter');

        const editButton = await page.locator('[data-testid="edit-callout-card"]');
        await editButton.click();

        // the settings panel consists of emoji-toggle and colour picker
        const emojiToggle = await page.locator('[data-testid="emoji-toggle"]');
        await expect(emojiToggle).toBeVisible();
        const colorPicker = await page.locator('[data-testid="callout-color-picker"]');
        await expect(colorPicker).toBeVisible();
    });

    test('can edit callout card', async function () {
        await focusEditor(page);
        await page.keyboard.type('/callout');
        await page.keyboard.press('Enter');

        await page.keyboard.type('Hello World');

        const calloutCard = await page.locator('[data-kg-card="callout"]');
        await expect(calloutCard).toContainText('💡Hello World ');
    });

    test('can toggle emoji', async function () {
        await focusEditor(page);
        await page.keyboard.type('/callout');
        await page.keyboard.press('Enter');

        // click <button data-testid="edit-callout-card"
        const editButton = await page.locator('[data-testid="edit-callout-card"]');
        await editButton.click();

        const toggle = await page.locator('[data-testid="emoji-toggle"]');
        await toggle.click();
        // click on data-kg-card="callout"
        await page.click('[data-kg-card="callout"]');
        await page.keyboard.type('Hello World');

        const calloutCard = await page.locator('[data-kg-card="callout"]');
        await expect(calloutCard).not.toContainText('💡');
    });

    test('can render emoji picker', async function () {
        await focusEditor(page);
        await page.keyboard.type('/callout');
        await page.keyboard.press('Enter');

        // click <button data-testid="edit-callout-card"
        const editButton = await page.locator('[data-testid="edit-callout-card"]');
        await editButton.click();
        
        await page.getByRole('button', {name: '💡'}).click();
        const emojiPickerContainer = await page.locator('[data-testid="emoji-picker-container"]');
        await expect(emojiPickerContainer).toBeVisible();
    });

    test('colour picker renders all colours', async function () {
        await focusEditor(page);
        await page.keyboard.type('/callout');
        await page.keyboard.press('Enter');
        const editButton = await page.locator('[data-testid="edit-callout-card"]');
        await editButton.click();

        await Promise.all(calloutColorPicker.map(async (color) => {
            const colorPicker = await page.locator(`[data-test-id="color-picker-${color.name}"]`);
            await expect(colorPicker).toBeVisible();
        }));
    });

    test('can change background color', async function () {
        await focusEditor(page);
        await page.keyboard.type('/callout');
        await page.keyboard.press('Enter');

        // click <button data-testid="edit-callout-card"
        const editButton = await page.locator('[data-testid="edit-callout-card"]');
        await editButton.click();
        const colorPicker = await page.locator(`[data-test-id="color-picker-green"]`);
        await colorPicker.click();
        
        // ensure data-test-id="callout-bg-blue" is visible
        const greenCallout = await page.locator('[data-testid="callout-bg-green"]');
        await expect(greenCallout).toBeVisible();
    });

    it('can select an emoji', async function () {
        await focusEditor(page);
        await page.keyboard.type('/callout');
        await page.keyboard.press('Enter');

        // click <button data-testid="edit-callout-card"
        const editButton = await page.locator('[data-testid="edit-callout-card"]');
        await editButton.click();
        await page.getByRole('button', {name: '💡'}).click();
        const lolEmoji = await page.locator('[aria-label="😂"]').nth(0); // nth(0) is required because there could two emojis with the same label (eg from frequently used)
        await lolEmoji.click();
        // await page.keyboard.type('Joke of the day');
        const calloutCard = await page.locator('[data-kg-card="callout"]');
        await expect(calloutCard).toContainText('😂');
    });
});
