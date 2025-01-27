import {assertHTML, focusEditor, html, initialize, insertCard} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Call To Action Card', async () => {
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
        await expect(page.locator(firstChildSelector)).not.toHaveClass(/bg-(grey|green|blue|yellow|red)/); // shouldn't have any of the classes yet
        for (const color of colors) {
            await page.click(`[data-test-id="${color.testId}"]`);
            await expect(page.locator(firstChildSelector)).toHaveClass(new RegExp(color.expectedClass));
        }
    });
});
