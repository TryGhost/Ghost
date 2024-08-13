import {expect, test} from '@playwright/test';
import {focusEditor,initialize, insertCard} from '../utils/e2e';

test.describe('Content Visibility', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page, uri: '/#/?content=false&labs=contentVisibility'});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('HTML card', async function () {
        test('toolbar shows content visibility icon', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');

            await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-selected', 'true');
            await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-editing', 'false');
            await expect(page.locator('[data-kg-card-toolbar="html"]')).toBeVisible();
            await expect(page.locator('[data-kg-card-toolbar="html"] [aria-label="Visibility"]')).toBeVisible();
        });

        test('toolbar shows visibility options on click', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');

            const card = page.locator('[data-kg-card="html"]');

            await card.locator('[aria-label="Visibility"]').click();

            // settings are visible
            await expect(card.getByTestId('visibility-settings')).toBeVisible();
        });

        test('clicking on settings does not transition into edit mode', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');

            const card = page.locator('[data-kg-card="html"]');

            await card.locator('[aria-label="Visibility"]').click();
            await card.getByTestId('visibility-settings').click();

            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        });

        test('changing a setting puts icon in active state', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');

            const card = page.locator('[data-kg-card="html"]');

            // button is not highlighted
            await expect(card.locator('[aria-label="Visibility"]')).toHaveAttribute('data-kg-active', 'false');

            await card.locator('[aria-label="Visibility"]').click();
            await card.locator('[data-testid="visibility-toggle-email-only"]').click();

            // button is highlighted
            await expect(card.locator('[aria-label="Visibility"]')).toHaveAttribute('data-kg-active', 'true');
        });

        test('visibility settings - defaults to show on email and web and all subscribers', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');

            const card = page.locator('[data-kg-card="html"]');

            await card.locator('[aria-label="Visibility"]').click();

            await expect(card.locator('div').first()).toContainText('Shown on web and in email to all subscribers');
        });

        test('can toggle visibility settings - show on web is off', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');

            const card = page.locator('[data-kg-card="html"]');

            await card.locator('[aria-label="Visibility"]').click();

            await card.locator('[data-testid="visibility-toggle-web-only"]').click();
            // it should now contain the message "Only shown in email to all subscribers"

            await expect(card.locator('div').first()).toContainText('Only shown in email to all subscribers');
        });

        test('can toggle visibility settings - show on email is off', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');

            const card = page.locator('[data-kg-card="html"]');

            await card.locator('[aria-label="Visibility"]').click();

            await card.locator('[data-testid="visibility-toggle-email-only"]').click();
            // it should now contain the message "Only shown on web"

            await expect(card.locator('div').first()).toContainText('Only shown on web');
        });

        test('can toggle visibility settings - show on email and web and all subscribers', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');

            const card = page.locator('[data-kg-card="html"]');

            await card.locator('[aria-label="Visibility"]').click();

            await expect(card.locator('div').first()).toContainText('Shown on web and in email to all subscribers');
        });

        test('can toggle visibility settings segments - free subscribers', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');

            const card = page.locator('[data-kg-card="html"]');

            await card.locator('[aria-label="Visibility"]').click();

            await card.locator('[data-testid="visibility-dropdown-segment"]').click();

            await card.locator('[data-test-value="status:free"]').click();

            await expect(card.locator('div').first()).toContainText('Shown on web and in email to free subscribers');
        });

        test('can toggle visibility settings segments - paid subscribers', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');

            const card = page.locator('[data-kg-card="html"]');

            await card.locator('[aria-label="Visibility"]').click();

            await card.locator('[data-testid="visibility-dropdown-segment"]').click();
            await card.locator('[data-test-value="status:-free"]').click();

            await expect(card.locator('div').first()).toContainText('Shown on web and in email to paid subscribers');
        });

        test('can toggle visibility settings segments - all subscribers', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');

            const card = page.locator('[data-kg-card="html"]');

            await card.locator('[aria-label="Visibility"]').click();

            await card.locator('[data-testid="visibility-dropdown-segment"]').click();
            await card.locator('[data-test-value=""]').click();

            await expect(card.locator('div').first()).toContainText('Shown on web and in email to all subscribers');
        });

        test('can toggle visibility - disable everything', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');

            const card = page.locator('[data-kg-card="html"]');

            await card.locator('[aria-label="Visibility"]').click();

            await card.locator('[data-testid="visibility-toggle-web-only"]').click();
            await card.locator('[data-testid="visibility-toggle-email-only"]').click();

            await expect(card.locator('div').first()).toContainText('Hidden from both email and web');
        });
    });
});
