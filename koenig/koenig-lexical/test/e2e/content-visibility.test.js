import {expect, test} from '@playwright/test';
import {focusEditor,initialize, insertCard} from '../utils/e2e';

test.describe('Content Visibility', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('HTML card (contentVisibility flag)', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: '/#/?content=false&labs=contentVisibility'});
        });

        async function insertHtmlCard() {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');
            return page.locator('[data-kg-card="html"]');
        }

        test('toolbar shows edit icon', async function () {
            await insertHtmlCard();

            await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-selected', 'true');
            await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-editing', 'false');
            await expect(page.locator('[data-kg-card-toolbar="html"]')).toBeVisible();
            await expect(page.locator('[data-kg-card-toolbar="html"] [data-testid="edit-html"]')).toBeVisible();
        });

        test('toolbar shows settings panel on click', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('edit-html').click();

            // settings are visible
            await expect(card.getByTestId('settings-panel')).toBeVisible();
            await card.getByTestId('tab-visibility').click();
            await expect(card.getByTestId('visibility-show-on-web')).toBeVisible();
        });

        test('clicking on edit button transitions card into edit mode', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('edit-html').click();

            await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
        });

        test('visibility settings - defaults to show on email and web and all members', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('edit-html').click();

            await expect(card.getByTestId('visibility-message')).not.toBeVisible();
        });

        test('can toggle visibility settings - show on web is off', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('edit-html').click();
            await card.getByTestId('tab-visibility').click();
            await card.getByTestId('visibility-show-on-web').click();

            await expect(card.getByTestId('visibility-message')).toContainText('Hidden on website');
        });

        test('can toggle visibility settings - show on email is off', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('edit-html').click();
            await card.getByTestId('tab-visibility').click();
            await card.getByTestId('visibility-show-on-email').click();

            await expect(card.getByTestId('visibility-message')).toContainText('Hidden in newsletter');
        });

        test('can toggle visibility settings segments - free members', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('edit-html').click();
            await card.getByTestId('tab-visibility').click();
            await card.getByTestId('visibility-dropdown-segment').click();
            await card.locator('[data-test-value="status:free"]').click();

            await expect(card.getByTestId('visibility-message')).toContainText('Hidden in paid newsletter');
        });

        test('can toggle visibility settings segments - paid members', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('edit-html').click();
            await card.getByTestId('tab-visibility').click();
            await card.getByTestId('visibility-dropdown-segment').click();
            await card.locator('[data-test-value="status:-free"]').click();

            await expect(card.getByTestId('visibility-message')).toContainText('Hidden in free newsletter');
        });

        test('can toggle visibility settings segments - all members', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('edit-html').click();
            await card.getByTestId('tab-visibility').click();
            await card.getByTestId('visibility-dropdown-segment').click();
            await card.locator('[data-test-value="status:free,status:-free"]').click();

            await expect(card.getByTestId('visibility-message')).not.toBeVisible();
        });

        test('can toggle visibility - disable everything', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('edit-html').click();
            await card.getByTestId('tab-visibility').click();
            await card.getByTestId('visibility-show-on-web').click();
            await card.getByTestId('visibility-show-on-email').click();

            await expect(card.getByTestId('visibility-message')).toContainText('Hidden on website and newsletter');
        });

        test('can toggle visibility - member settings hidden when stripe is not enabled', async function () {
            await initialize({page, uri: '/#/?content=false&labs=contentVisibility&stripe=false'});
            const card = await insertHtmlCard();

            await card.getByTestId('edit-html').click();
            await card.getByTestId('tab-visibility').click();

            await expect(card.getByTestId('visibility-dropdown-segment')).not.toBeVisible();
        });

        test('can click toggle label to change visibility settings', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('edit-html').click();
            await card.getByTestId('tab-visibility').click();

            await expect(page.getByTestId('visibility-show-on-web').locator('input')).toBeChecked();
            // click on the surrounding label rather than the inner label/input
            await page.getByTestId('visibility-show-on-web').click();
            await expect(page.getByTestId('visibility-show-on-web').locator('input')).not.toBeChecked();
        });
    });

    test.describe('HTML card (contentVisibilityAlpha flag)', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: '/#/?content=false&labs=contentVisibility,contentVisibilityAlpha'});
        });

        async function insertHtmlCard() {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');
            return page.locator('[data-kg-card="html"]');
        }

        test('toolbar shows edit icon', async function () {
            await insertHtmlCard();

            await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-selected', 'true');
            await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-editing', 'false');
            await expect(page.locator('[data-kg-card-toolbar="html"]')).toBeVisible();
            await expect(page.locator('[data-kg-card-toolbar="html"] [data-testid="edit-html"]')).toBeVisible();
        });

        test('toolbar shows settings panel on click', async function () {
            const card = await insertHtmlCard();
            await card.getByTestId('edit-html').click();

            // settings are visible
            await expect(card.getByTestId('settings-panel')).toBeVisible();
            await card.getByTestId('tab-visibility').click();
            await expect(card.getByTestId('visibility-toggle-web-nonMembers')).toBeVisible();
        });

        test('clicking on edit button transitions card into edit mode', async function () {
            const card = await insertHtmlCard();
            await card.getByTestId('edit-html').click();

            await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
        });

        test('visibility settings defaults to show on email and web and all members', async function () {
            const card = await insertHtmlCard();
            await card.getByTestId('edit-html').click();

            await expect(card.getByTestId('visibility-message')).not.toBeVisible();

            await expect(card.getByTestId('visibility-toggle-web-nonMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-web-freeMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-web-paidMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-email-freeMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-email-paidMembers')).toBeChecked();
        });

        test('can toggle visibility settings ', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('edit-html').click();
            await card.getByTestId('tab-visibility').click();

            await card.getByTestId('visibility-toggle-web-nonMembers').click();
            await expect(card.getByTestId('visibility-toggle-web-nonMembers')).not.toBeChecked();
            await card.getByTestId('visibility-toggle-web-freeMembers').click();
            await expect(card.getByTestId('visibility-toggle-web-freeMembers')).not.toBeChecked();
            await card.getByTestId('visibility-toggle-web-paidMembers').click();
            await expect(card.getByTestId('visibility-toggle-web-paidMembers')).not.toBeChecked();
            await card.getByTestId('visibility-toggle-email-freeMembers').click();
            await expect(card.getByTestId('visibility-toggle-email-freeMembers')).not.toBeChecked();
            await card.getByTestId('visibility-toggle-email-paidMembers').click();
            await expect(card.getByTestId('visibility-toggle-email-paidMembers')).not.toBeChecked();

            // change from the beta - visibility message is no longer shown
            await expect(card.getByTestId('visibility-message')).not.toBeVisible();
        });

        test('visibility icon is shown when visibility changes from shown-to-all', async function () {
            const card = await insertHtmlCard();

            await expect(page.getByTestId('visibility-indicator')).not.toBeVisible();

            await card.getByTestId('edit-html').click();
            await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
            await card.getByTestId('visibility-toggle-web-nonMembers').click();

            await expect(page.getByTestId('visibility-indicator')).toBeVisible();

            // clicking visibility indicator toggles edit mode
            await page.getByTestId('visibility-indicator').click();
            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
            await page.getByTestId('visibility-indicator').click();
            await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
        });

        test('paid member visibility settings hidden when stripe is not enabled', async function () {
            await initialize({page, uri: '/#/?content=false&labs=contentVisibility,contentVisibilityAlpha&stripe=false'});
            const card = await insertHtmlCard();

            await card.getByTestId('edit-html').click();
            await card.getByTestId('tab-visibility').click();

            await expect(card.getByTestId('visibility-toggle-web-paidMembers')).not.toBeVisible();
            await expect(card.getByTestId('visibility-toggle-email-paidMembers')).not.toBeVisible();
        });
    });
});
