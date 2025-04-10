import {expect, test} from '@playwright/test';
import {focusEditor,initialize, insertCard} from '../utils/e2e';

test.describe('Content Visibility', async () => {
    let page;
    async function insertHtmlCard() {
        await focusEditor(page);
        await insertCard(page, {cardName: 'html'});
        await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
        await page.keyboard.type('Testing');
        await page.keyboard.press('Meta+Enter');
        return page.locator('[data-kg-card="html"]');
    }
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

        test('toolbar shows edit icon', async function () {
            await insertHtmlCard();

            await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-selected', 'true');
            await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-editing', 'false');
            await expect(page.locator('[data-kg-card-toolbar="html"]')).toBeVisible();
            await expect(page.locator('[data-kg-card-toolbar="html"] [data-testid="edit-html"]')).toBeVisible();
        });

        test('toolbar does not show settings panel by default on click', async function () {
            const card = await insertHtmlCard();
            await card.getByTestId('edit-html').click();
            await expect(card.getByTestId('settings-panel')).not.toBeVisible();
        });

        test('clicking on edit button transitions card into edit mode', async function () {
            const card = await insertHtmlCard();
            await card.getByTestId('edit-html').click();

            await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
        });

        test('visibility settings defaults to show on email and web and all members', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('tab-visibility').click();

            await expect(card.getByTestId('visibility-message')).not.toBeVisible();

            await expect(card.getByTestId('visibility-toggle-web-nonMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-web-freeMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-web-paidMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-email-freeMembers')).toBeChecked();
            await expect(card.getByTestId('visibility-toggle-email-paidMembers')).toBeChecked();
        });

        test('can toggle visibility settings ', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('show-visibility').click();
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

        test('toggling settings in visibility panel does not trigger edit mode', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('tab-visibility').click();
            await card.getByTestId('visibility-toggle-web-nonMembers').click();
            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        });

        test('visibility icon is shown when visibility changes from shown-to-all', async function () {
            const card = await insertHtmlCard();

            await expect(page.getByTestId('visibility-indicator')).not.toBeVisible();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('tab-visibility').click();
            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
            await card.getByTestId('visibility-toggle-web-nonMembers').click();

            await expect(page.getByTestId('visibility-indicator')).toBeVisible();
        });

        test('paid member visibility settings hidden when stripe is not enabled', async function () {
            await initialize({page, uri: '/#/?content=false&labs=contentVisibility&stripe=false'});
            const card = await insertHtmlCard();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('tab-visibility').click();

            await expect(card.getByTestId('visibility-toggle-web-paidMembers')).not.toBeVisible();
            await expect(card.getByTestId('visibility-toggle-email-paidMembers')).not.toBeVisible();
        });

        test('visibility indicator can toggle visibility settings panel', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('tab-visibility').click();

            await card.getByTestId('visibility-toggle-web-nonMembers').click();

            await page.getByTestId('post-title').click();
            await page.getByTestId('visibility-indicator').click();

            await expect(card.getByTestId('settings-panel')).toBeVisible();
        });

        test('clicking show visibility in toolbar does not trigger edit mode', async function () {
            const card = await insertHtmlCard();

            await page.getByTestId('show-visibility').click();
            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        });

        test('clicking visibility indicator does not trigger edit mode', async function () {
            const card = await insertHtmlCard();

            await card.getByTestId('show-visibility').click();
            await card.getByTestId('tab-visibility').click();

            await card.getByTestId('visibility-toggle-web-nonMembers').click();

            await page.getByTestId('post-title').click();

            await page.getByTestId('visibility-indicator').click();
            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        });
    });

    test.describe('Edge cases', async function () {
        test.beforeEach(async () => {
            await initialize({page, uri: '/#/?content=false&labs=contentVisibility'});
        });
        // We need to ensure that when we used the visibility indicator to toggle the visibility settings and then
        // switch to a different card type, the visibility settings state is reset so that you don't have visibility settings
        // to be visible when it was not explicitly set.
        test('Visibility Settings Card state are reset when switching between different card types', async function () {
            // Set up HTML card with visibility settings
            const htmlCard = await insertHtmlCard();
            await htmlCard.getByTestId('show-visibility').click();
            await htmlCard.getByTestId('tab-visibility').click();
            await htmlCard.getByTestId('visibility-toggle-web-nonMembers').click();

            // Add CTA card and configure its visibility
            await page.keyboard.press('Enter');
            const ctaCard = await insertCard(page, {cardName: 'call-to-action'});
            await page.click('[data-testid="cta-card-content-editor"]');
            await page.keyboard.type('This is a new CTA Card.');

            await ctaCard.getByTestId('tab-visibility').click();
            await ctaCard.getByTestId('visibility-toggle-web-nonMembers').click();
            await page.click('body');
            // Verify visibility indicator works for HTML card
            await page.getByTestId('visibility-indicator').first().click();
            await expect(htmlCard.getByTestId('settings-panel')).toBeVisible();
        });
    });
});
