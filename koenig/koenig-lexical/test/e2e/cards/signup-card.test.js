import path from 'path';
import {assertHTML, focusEditor, html, initialize, insertCard} from '../../utils/e2e';
import {expect, test} from '@playwright/test';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Signup card', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test('renders signup card node', async function ({page}) {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="signup">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can edit header', async function ({page}) {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.keyboard.type('Hello world');
        const firstEditor = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(0);
        await expect(firstEditor).toHaveText('Hello world');
    });

    test('can edit subheader', async function ({page}) {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.keyboard.press('Enter');
        await page.keyboard.type('Hello subheader');

        const secondEditor = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(1);

        await expect(secondEditor).toHaveText('Hello subheader');
    });

    test('can edit disclaimer', async function ({page}) {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Hello disclaimer');

        const thirdEditor = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(2);

        await expect(thirdEditor).toHaveText('Hello disclaimer');
    });

    test('can edit subheader and disclaimer via arrow keys', async function ({page}) {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.keyboard.type('Hello');

        await page.keyboard.press('ArrowDown');
        await page.keyboard.type('medium length');

        await page.keyboard.press('ArrowDown');
        await page.keyboard.type('something even longer');

        // Go back up again and add an extra word

        await page.keyboard.press('ArrowUp');
        await page.keyboard.type(' here');

        await page.keyboard.press('ArrowUp');
        await page.keyboard.type(' world');

        const firstEditor = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(0);
        const secondEditor = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(1);
        const thirdEditor = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(2);

        await expect(firstEditor).toHaveText('Hello world');
        await expect(secondEditor).toHaveText('medium length here');
        await expect(thirdEditor).toHaveText('something even longer');
    });

    test('can edit button text', async function ({page}) {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.click('[data-testid="signup-button-text"]');
        await page.keyboard.type('Click me');

        await expect(page.getByTestId('signup-card-button')).toHaveText('Click me');
    });

    test('can change the background color', async function ({page}) {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        const lightButton = page.locator('[aria-label="Light"]');
        const darkButton = page.locator('[aria-label="Dark"]');
        const accentButton = page.locator('[aria-label="Accent"]');

        // Default class should be 'bg-black' on the card
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveClass(/ bg-black /);

        // Switch to light
        await lightButton.click();

        // Check that the background color has changed
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveClass(/ bg-grey-100 /);

        // Switch back to dark
        await darkButton.click();

        // Check that the background color has changed
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveClass(/ bg-black /);

        // Switch to accent
        await accentButton.click();

        // Check that the background color has changed
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveClass(/ bg-accent /);
    });

    test('can add and remove background image', async function ({page}) {
        const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/large-image.jpeg`);

        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        const fileChooserPromise = page.waitForEvent('filechooser');

        // Click data-testid="background-image-color-button"
        await page.click('[data-testid="background-image-color-button"]');

        // Set files
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        // Check if it is set as a background image
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-image', /blob:/);

        // Check if it is also set as an image in the panel
        await expect(page.getByTestId('image-picker-background')).toHaveAttribute('src', /blob:/);
    });
});
