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

        await page.click('[data-testid="signup-background-color"] [aria-label="Pick colour"]');

        await page.click('[data-testid="signup-background-color"] input');
        await page.keyboard.type('ff0000');

        // Selected colour should be applied inline
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-color', 'rgb(255, 0, 0)');
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('color', 'rgb(255, 255, 255)');

        // Check that the text colour updates to contrast with the background

        await page.fill('[data-testid="signup-background-color"] input', '');
        await page.keyboard.type('f7f7f7');

        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-color', 'rgb(247, 247, 247)');
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('color', 'rgb(0, 0, 0)');
    });

    test('can add and remove background image', async function ({page}) {
        const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/large-image.jpeg`);
        const fileChooserPromise = page.waitForEvent('filechooser');

        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.click('[data-testid="signup-background-image-toggle"]');
        await page.click('[data-testid="media-upload-placeholder"]');

        // Set files
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        // Check if it is set as a background image
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-image', /blob:/);

        // Check if it is also set as an image in the panel
        await expect(page.locator('[data-testid="media-upload-filled"] img')).toHaveAttribute('src', /blob:/);
    });

    test('can change the button color', async function ({page}) {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.click('[data-testid="signup-button-color"] [aria-label="Pick colour"]');

        await page.click('[data-testid="signup-button-color"] input');
        await page.keyboard.type('ff0000');

        // Selected colour should be applied inline
        await expect(page.locator('[data-testid="signup-card-button"]')).toHaveCSS('background-color', 'rgb(255, 0, 0)');
        await expect(page.locator('[data-testid="signup-card-button"]')).toHaveCSS('color', 'rgb(255, 255, 255)');

        // Check that the text colour updates to contrast with the background

        await page.fill('[data-testid="signup-button-color"] input', '');
        await page.keyboard.type('f7f7f7');

        await expect(page.locator('[data-testid="signup-card-button"]')).toHaveCSS('background-color', 'rgb(247, 247, 247)');
        await expect(page.locator('[data-testid="signup-card-button"]')).toHaveCSS('color', 'rgb(0, 0, 0)');
    });

    test('can add and remove labels', async function ({page}) {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.click('[data-testid="labels-dropdown"] input');

        // Add existing label

        await page.keyboard.type('Label 1');
        await page.click('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-item"]');

        await expect(page.locator('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]')).toHaveCount(1);
        await expect(page.locator('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]')).toHaveText('Label 1');

        // Add new label

        await page.keyboard.type('Some new label');
        await page.keyboard.press('Enter');

        await expect(page.locator('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]')).toHaveCount(2);
        await expect(page.locator('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]:nth-child(2)')).toHaveText('Some new label');

        // Remove label with backspace

        await page.keyboard.press('Backspace');

        await expect(page.locator('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]')).toHaveCount(1);

        // Remove label by clicking

        await page.click('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]');

        await expect(page.locator('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]')).toHaveCount(0);
    });
});
