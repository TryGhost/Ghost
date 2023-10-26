import {assertHTML, focusEditor, initialize} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Emoji Picker Plugin', async function () {
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

    test('displays an emoji menu when typing : followed by a character', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();
    });

    test('hides emoji menu when typing a space after the colon', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();
        await page.keyboard.press('Space');
        await expect(page.getByTestId('emoji-menu')).not.toBeVisible();
    });

    test('hides the emoji menu when pressing escape', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('emoji-menu')).not.toBeVisible();
    });

    test('can use the arrow keys to navigate the emoji menu', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();
        await expect(page.getByTestId('emoji-option-0')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('emoji-option-1')).toHaveAttribute('aria-selected', 'false');

        await page.keyboard.press('ArrowDown');
        await expect(page.getByTestId('emoji-option-0')).toHaveAttribute('aria-selected', 'false');
        await expect(page.getByTestId('emoji-option-1')).toHaveAttribute('aria-selected', 'true');

        await page.keyboard.press('ArrowUp');
        await expect(page.getByTestId('emoji-option-0')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('emoji-option-1')).toHaveAttribute('aria-selected', 'false');
    });

    test('can use the enter key to select an emoji', async function () {
        await focusEditor(page);

        await page.keyboard.type(':+1');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();

        await page.keyboard.press('Enter');

        await expect(page.getByTestId('emoji-menu')).not.toBeVisible();
        await assertHTML(page, '<p dir="ltr"><span data-lexical-text="true">👍</span></p>');
    });

    test('filters the emoji menu when typing', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();
        await expect(page.getByTestId('emoji-option-0')).toHaveText('🦖t-rex');
        await expect(page.getByTestId('emoji-option-1')).toHaveText('🏓table_tennis_paddle_and_ball');

        await page.keyboard.type('a');
        await expect(page.getByTestId('emoji-option-0')).toHaveText('🏓table_tennis_paddle_and_ball');
        await expect(page.getByTestId('emoji-option-1')).toHaveText('🌮taco');

        await page.keyboard.type('c');
        await expect(page.getByTestId('emoji-option-0')).toHaveText('🌮taco');
        await expect(page.getByTestId('emoji-option-1')).not.toBeVisible();

        await page.keyboard.press('Enter');
        await assertHTML(page, '<p dir="ltr"><span data-lexical-text="true">🌮</span></p>');
    });
    
    test('can use the mouse to select an emoji', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();

        await page.click('[data-testid="emoji-option-2"]');

        await expect(page.getByTestId('emoji-menu')).not.toBeVisible();
        await assertHTML(page, '<p dir="ltr"><span data-lexical-text="true">🌮</span></p>');
    });
    
    test('can use punctuation', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t-rex');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();

        await page.keyboard.press('Enter');
        await assertHTML(page, '<p dir="ltr"><span data-lexical-text="true">🦖</span></p>');
    });

    // TODO: see why this doesn't work with node 16
    test.skip('can put emojis back to back without spaces', async function () {
        await focusEditor(page);

        await page.keyboard.type(':tac',{delay: 100});
        await page.keyboard.press('Enter');
        await page.keyboard.type(':tac',{delay: 100});
        await page.keyboard.press('Enter');

        await assertHTML(page, '<p dir="ltr"><span data-lexical-text="true">🌮🌮</span></p>');
    });
});
