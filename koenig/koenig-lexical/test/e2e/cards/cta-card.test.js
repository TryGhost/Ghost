import path from 'path';
import {assertHTML, focusEditor, html, initialize, insertCard} from '../../utils/e2e';
import {expect, test} from '@playwright/test';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Call To Action Card', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page, uri: '/#/?content=false&labs=contentVisibility,contentVisibilityAlpha'});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('renders CTA Card', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="call-to-action">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can toggle button on card', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="button-settings"]');
        expect(await page.isVisible('[data-testid="cta-button"]')).toBe(true);

        await page.click('[data-testid="button-settings"]');

        expect(await page.isVisible('[data-testid="cta-button"]')).toBe(false);
    });

    test('button settings expands and collapses when toggled', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="button-settings"]');
        // determine if settings are open byy looking for cta-button-color, button-text & button-url
        expect(await page.isVisible('[data-testid="cta-button-color"]')).toBe(true);
        expect(await page.isVisible('[data-testid="button-text"]')).toBe(true);
        expect(await page.isVisible('[data-testid="button-url"]')).toBe(true);

        await page.click('[data-testid="button-settings"]');
        // determine if settings are closed by looking for cta-button-color, button-text & button-url
        expect(await page.isVisible('[data-testid="cta-button-color"]')).toBe(false);
        expect(await page.isVisible('[data-testid="button-text"]')).toBe(false);
        expect(await page.isVisible('[data-testid="button-url"]')).toBe(false);
    });

    test('can set button text', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="button-settings"]');
        await page.fill('[data-testid="button-text"]', 'Click me');
        expect(await page.textContent('[data-testid="cta-button"]')).toBe('Click me');
    });

    test('can set button url', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="button-settings"]');
        await page.fill('[data-testid="button-url"]', 'https://example.com/somepost');
        const buttonContainer = await page.$('[data-test-cta-button-current-url]');
        const currentUrl = await buttonContainer.getAttribute('data-test-cta-button-current-url');
        expect(currentUrl).toBe('https://example.com/somepost');
    });

    // NOTE: an improvement would be to pass in suggested url options, but the construction now doesn't make that straightforward
    test('suggested urls display', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="button-settings"]');

        const buttonTextInput = await page.getByTestId('button-url');
        await expect(buttonTextInput).toHaveValue('');

        await page.getByTestId('button-url').fill('Home');
        await page.waitForSelector('[data-testid="button-url-listOption"]');

        await expect(await page.getByTestId('button-url-listOption')).toContainText('Homepage');
        await page.getByTestId('button-url-listOption').click();
        const buttonContainer = await page.$('[data-test-cta-button-current-url]');
        const currentUrl = await buttonContainer.getAttribute('data-test-cta-button-current-url');
        // current view can be any url, so check for a valid url
        const validUrlRegex = /^(https?:\/\/)([\w.-]+)(:[0-9]+)?(\/[\w.-]*)*(\?.*)?(#.*)?$/;
        // Assert the URL is valid
        expect(currentUrl).toMatch(validUrlRegex);
    });

    test('button doesnt disappear when toggled, has text, has url and loses focus', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="button-settings"]');
        await page.fill('[data-testid="button-text"]', 'Click me');
        await page.fill('[data-testid="button-url"]', 'https://example.com/somepost');
        expect(await page.isVisible('[data-testid="cta-button"]')).toBe(true);
        expect(await page.textContent('[data-testid="cta-button"]')).toBe('Click me');
        const buttonContainer = await page.$('[data-test-cta-button-current-url]');
        const currentUrl = await buttonContainer.getAttribute('data-test-cta-button-current-url');
        expect(currentUrl).toBe('https://example.com/somepost');

        // lose focus and editing mode
        await page.keyboard.press('Escape');
        await page.keyboard.press('Enter');

        // check if editing is false
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="call-to-action">
                </div>
            </div>
            <p><br /></p>
            <p><br /></p>
        `, {ignoreCardContents: true});

        expect(await page.isVisible('[data-testid="cta-button"]')).toBe(true);
    });

    test('default button colour is accent', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="button-settings"]');
        expect(await page.getAttribute('[data-testid="cta-button"]', 'class')).toContain('bg-accent');
    });

    test('can change button colour to black', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="button-settings"]');
        // find the parent element cta-button-color and select child button with title=black
        await page.click('[data-testid="cta-button-color"] button[title="Black"]');
        // check if the button has style="background-color: rgb(0, 0, 0);"
        expect(await page.getAttribute('[data-testid="cta-button"]', 'style')).toContain('background-color: rgb(0, 0, 0);');
    });

    test('can change button colour to grey', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="button-settings"]');
        // find the parent element cta-button-color and select child button with title=white
        await page.click('[data-testid="cta-button-color"] button[title="Grey"]');
        // check if the button has style="background-color: rgb(255, 255, 255);"
        expect(await page.getAttribute('[data-testid="cta-button"]', 'style')).toContain('background-color: rgb(240, 240, 240);');
    });

    test('can use colour picker to change button colour', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="button-settings"]');
        await page.click('button[aria-label="Pick color"]');
        await page.fill('input[aria-label="Color value"]', 'ff0000');
        expect(await page.getAttribute('[data-testid="cta-button"]', 'style')).toContain('background-color: rgb(255, 0, 0);');
    });

    test('button text colour changes with button colour', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="button-settings"]');
        await page.fill('[data-testid="button-text"]', 'Click me');
        await page.click('button[aria-label="Pick color"]');
        await page.fill('input[aria-label="Color value"]', 'FFFFFF');
        expect(await page.getAttribute('[data-testid="cta-button"]', 'style')).toContain('color: rgb(255, 255, 255);');

        // change button colour to black
        await page.click('[data-testid="cta-button-color"] button[title="Black"]');
        expect(await page.getAttribute('[data-testid="cta-button"]', 'style')).toContain('color: rgb(0, 0, 0);');
    });

    test('can toggle sponsor label', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="sponsor-label-toggle"]');
        expect(await page.isVisible('[data-testid="sponsor-label"]')).toBe(false);

        await page.click('[data-testid="sponsor-label-toggle"]');
        expect(await page.isVisible('[data-testid="sponsor-label"]')).toBe(true);
    });

    test('can change background colours', async function () {
        const colors = [
            {testId: 'color-picker-none', expectedClass: 'bg-transparent border-transparent'},
            {testId: 'color-picker-white', expectedClass: 'bg-transparent border-grey'},
            {testId: 'color-picker-grey', expectedClass: 'bg-grey'},
            {testId: 'color-picker-green', expectedClass: 'bg-green'},
            {testId: 'color-picker-blue', expectedClass: 'bg-blue'},
            {testId: 'color-picker-yellow', expectedClass: 'bg-yellow'},
            {testId: 'color-picker-red', expectedClass: 'bg-red'}
        ];
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});

        const firstChildSelector = '[data-kg-card="call-to-action"] > :first-child';
        await expect(page.locator(firstChildSelector)).not.toHaveClass(/bg-(green|blue|yellow|red)/); // shouldn't have any of the classes yet
        for (const color of colors) {
            await page.click(`[data-test-id="${color.testId}"]`);
            await expect(page.locator(firstChildSelector)).toHaveClass(new RegExp(color.expectedClass));
        }
    });

    test('can add and remove CTA Card image', async function () {
        const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/large-image.jpeg`);

        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.click('[data-testid="media-upload-placeholder"]');

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        const imgLocator = page.locator('[data-kg-card="call-to-action"] img[src^="blob:"]');
        const imgElement = await imgLocator.first();
        await expect(imgElement).toHaveAttribute('src', /blob:/);
        await page.click('[data-testid="media-upload-remove"]');
        await expect(imgLocator).not.toBeVisible();
    });

    test('default layout is minimal', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        // find data-cta-layout and check if it data-cta-layout="minimal"
        const firstChildSelector = '[data-kg-card="call-to-action"] > :first-child';
        await expect(page.locator(firstChildSelector)).toHaveAttribute('data-cta-layout', 'minimal');
        expect(await page.getAttribute('[data-testid="cta-card-content-editor"]', 'class')).toContain('text-left');
    });

    test('can toggle layout to immersive', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="immersive-layout"]');
        // find data-cta-layout and check if it data-cta-layout="immersive"
        const firstChildSelector = '[data-kg-card="call-to-action"] > :first-child';
        await expect(page.locator(firstChildSelector)).toHaveAttribute('data-cta-layout', 'immersive');
        expect(await page.getAttribute('[data-testid="cta-card-content-editor"]', 'class')).toContain('text-center');
    });

    test('can toggle layout to immersive and then back to minimal', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});
        await page.click('[data-testid="immersive-layout"]');
        // find data-cta-layout and check if it data-cta-layout="immersive"
        const firstChildSelector = '[data-kg-card="call-to-action"] > :first-child';
        await expect(page.locator(firstChildSelector)).toHaveAttribute('data-cta-layout', 'immersive');
        expect(await page.getAttribute('[data-testid="cta-card-content-editor"]', 'class')).toContain('text-center');

        await page.click('[data-testid="minimal-layout"]');
        // find data-cta-layout and check if it data-cta-layout="minimal"
        await expect(page.locator(firstChildSelector)).toHaveAttribute('data-cta-layout', 'minimal');
        expect(await page.getAttribute('[data-testid="cta-card-content-editor"]', 'class')).toContain('text-left');
    });

    test('has image preview', async function () {
        const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/large-image.jpeg`);

        await focusEditor(page);
        await insertCard(page, {cardName: 'call-to-action'});

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.click('[data-testid="media-upload-placeholder"]');

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        await page.waitForSelector('[data-testid="media-upload-filled"]');
        const previewImage = await page.locator('[data-testid="media-upload-filled"] img');
        await expect(previewImage).toBeVisible();
    });
});
