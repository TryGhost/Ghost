import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, focusEditor, html, initialize, startApp} from '../../utils/e2e';
import {calloutColorPicker} from '../../../src/components/ui/cards/CalloutCard';
import {expect} from '@playwright/test';

async function insertCalloutCard(page) {
    await page.keyboard.type('/callout');
    await page.waitForSelector('[data-kg-card-menu-item="Callout"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-kg-card="callout"]');
}

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

        // NOTE: don't ignore contents, we care that the data is deserialized and displayed correctly
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="callout">
                    <div>
                        <div><button type="button">😚</button></div>
                        <div><p><span>Hello World</span></p></div>
                    </div>
                </div>
            </div>
        `);

        // check the background color
        await expect(page.getByTestId('callout-bg-blue')).toBeVisible();
    });

    test('renders callout card', async function () {
        await focusEditor(page);
        await insertCalloutCard(page);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="callout">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('has settings panel', async function () {
        await focusEditor(page);
        await insertCalloutCard(page);

        // the settings panel consists of emoji-toggle and colour picker
        const emojiToggle = page.locator('[data-testid="emoji-toggle"]');
        await expect(emojiToggle).toBeVisible();
        const colorPicker = page.locator('[data-testid="callout-color-picker"]');
        await expect(colorPicker).toBeVisible();
    });

    test('can edit callout card', async function () {
        await focusEditor(page);
        await insertCalloutCard(page);

        await page.keyboard.type('Hello World');

        const calloutCard = page.locator('[data-kg-card="callout"]');
        await expect(calloutCard).toContainText('💡Hello World ');
    });

    test('can toggle emoji', async function () {
        await focusEditor(page);
        await insertCalloutCard(page);

        const toggle = page.locator('[data-testid="emoji-toggle"]');
        await toggle.click();
        // click on data-kg-card="callout"
        await page.click('[data-kg-card="callout"]');
        await page.keyboard.type('Hello World');

        const calloutCard = page.locator('[data-kg-card="callout"]');
        await expect(calloutCard).not.toContainText('💡');
    });

    test('can render emoji picker', async function () {
        await focusEditor(page);
        await insertCalloutCard(page);

        await page.getByRole('button', {name: '💡'}).click();
        const emojiPickerContainer = page.locator('[data-testid="emoji-picker-container"]');
        await expect(emojiPickerContainer).toBeVisible();
    });

    test('colour picker renders all colours', async function () {
        await focusEditor(page);
        await insertCalloutCard(page);

        await Promise.all(calloutColorPicker.map(async (color) => {
            const colorPicker = page.locator(`[data-test-id="color-picker-${color.name}"]`);
            await expect(colorPicker).toBeVisible();
        }));
    });

    test('can change background color', async function () {
        await focusEditor(page);
        await insertCalloutCard(page);

        const colorPicker = page.locator(`[data-test-id="color-picker-green"]`);
        await colorPicker.click();

        // ensure data-test-id="callout-bg-blue" is visible
        const greenCallout = page.locator('[data-testid="callout-bg-green"]');
        await expect(greenCallout).toBeVisible();
    });

    it('can select an emoji', async function () {
        await focusEditor(page);
        await insertCalloutCard(page);

        await page.getByRole('button', {name: '💡'}).click();
        const lolEmoji = page.locator('[aria-label="😂"]').nth(0); // nth(0) is required because there could two emojis with the same label (eg from frequently used)
        await lolEmoji.click();
        // await page.keyboard.type('Joke of the day');
        const calloutCard = page.locator('[data-kg-card="callout"]');
        await expect(calloutCard).toContainText('😂');
    });

    it('has edit toolbar', async function () {
        await focusEditor(page);
        await insertCalloutCard(page);

        // press arrow down
        // TODO: this is a bug! ArrowDown should only be required once
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown'); // press twice to make sure card gets unselected

        // press arrow up
        await page.keyboard.press('ArrowUp');

        const editButton = page.locator('[data-testid="edit-callout-card"]');
        await expect(editButton).toBeVisible();
    });

    it('can toggle edit', async function () {
        await focusEditor(page);
        await insertCalloutCard(page);

        // press arrow down
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown'); // press twice to make sure card gets unselected

        // press arrow up
        await page.keyboard.press('ArrowUp');

        const editButton = page.locator('[data-testid="edit-callout-card"]');
        await editButton.click();

        const calloutCard = page.locator('[data-kg-card="callout"]');
        await expect(calloutCard).toHaveAttribute('data-kg-card-editing', 'true');
    });
});
