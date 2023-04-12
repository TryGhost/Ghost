import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, focusEditor, html, initialize, insertCard, startApp} from '../../utils/e2e';
import {expect} from '@playwright/test';

describe('Button Card', async () => {
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

    test('can import serialized button card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'button',
                        buttonUrl: 'http://someblog.com/somepost',
                        buttonText: 'button text',
                        alignment: 'center'
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
            <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="button">
            </div>
        </div>
        `, {ignoreCardContents: true});
    });

    test('renders button card', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'button'});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="button">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('has settings panel', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'button'});

        await expect(await page.getByTestId('settings-panel')).toBeVisible();
        await expect(await page.getByTestId('button-align-left')).toBeVisible();
        await expect(await page.getByTestId('button-align-center')).toBeVisible();
        await expect(await page.getByTestId('button-input-text')).toBeVisible();
        await expect(await page.getByTestId('button-input-url')).toBeVisible();
    });

    test('alignment buttons work', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'button'});

        // align center by default
        const buttonCard = await page.getByTestId('button-card');
        await expect(buttonCard).toHaveClass(/justify-center/);

        const leftAlignButton = await page.getByTestId('button-align-left');
        leftAlignButton.click();
        await expect(buttonCard).toHaveClass(/justify-start/);

        const centerAlignButton = await page.getByTestId('button-align-center');
        centerAlignButton.click();
        await expect(buttonCard).toHaveClass(/justify-center/);
    });

    test('default settings are appropriate', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'button'});

        await expect(await page.getByTestId('button-card-btn-span').textContent()).toEqual('Add button text');
        const buttonTextInput = await page.getByTestId('button-input-text');
        await expect(buttonTextInput).toHaveAttribute('placeholder','Add button text');
        const buttonUrlInput = await page.getByTestId('button-input-url');
        await expect(buttonUrlInput).toHaveAttribute('placeholder','https://yoursite.com/#/portal/signup/');
    });

    test('text input field works', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'button'});

        // verify default values
        await expect(await page.getByTestId('button-card-btn-span').textContent()).toEqual('Add button text');

        const buttonTextInput = await page.getByTestId('button-input-text');
        await expect(buttonTextInput).toHaveValue('');

        await page.getByTestId('button-input-text').fill('test');
        await expect(buttonTextInput).toHaveValue('test');
        await expect(await page.getByTestId('button-card-btn-span').textContent()).toEqual('test');
    });

    test('url input field works', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'button'});

        const buttonTextInput = await page.getByTestId('button-input-url');
        await expect(buttonTextInput).toHaveValue('');

        await page.getByTestId('button-input-url').fill('https://someblog.com/somepost');
        await expect(buttonTextInput).toHaveValue('https://someblog.com/somepost');
        const buttonLink = await page.getByTestId('button-card-btn');
        await expect(buttonLink).toHaveAttribute('href','https://someblog.com/somepost');
    });

    // NOTE: an improvement would be to pass in suggested url options, but the construction now doesn't make that straightforward
    test('suggested urls display', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'button'});

        const buttonTextInput = await page.getByTestId('button-input-url');
        await expect(buttonTextInput).toHaveValue('');

        // this is dependent on the test values inserted in the node
        await page.getByTestId('button-input-url').fill('Ho');
        // this is too fast, need to try two inputs or add a delay before checking the suggested options
        await page.getByTestId('button-input-url').fill('me');
        await expect(await page.getByTestId('button-input-url-listOption-Homepage')).toHaveText('Homepage');
        await page.getByTestId('button-input-url-listOption').click();

        // need to make this any string value because we don't want to hardcode the window.location value
        const anyString = new RegExp(`.*`);
        await expect(buttonTextInput).toHaveValue(anyString);
        const buttonLink = await page.getByTestId('button-card-btn');
        await expect(buttonLink).toHaveAttribute('href',anyString);
    });
});
