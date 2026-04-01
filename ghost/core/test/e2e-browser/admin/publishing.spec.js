const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createPostDraft} = require('../utils');

/**
 * @param {import('@playwright/test').Page} page
 */
const openPublishFlow = async (page) => {
    await page.locator('[data-test-button="publish-flow"]').first().click();
};

/**
 * @param {import('@playwright/test').Page} page
 */
const closePublishFlow = async (page) => {
    await page.locator('[data-test-button="close-publish-flow"]').click();
};

/**
 * @param {import('@playwright/test').Page} page
 */
const openPostSettingsMenu = async (page) => {
    await page.locator('[data-test-psm-trigger]').click();
};

/**
 * @typedef {Object} PublishOptions
 * @property {'publish'|'publish+send'|'send'|null} [type]
 * @property {String} [recipientFilter]
 * @property {String} [newsletter]
 * @property {String} [date]
 * @property {String} [time]
 */

/**
 * Open and complete publish flow, filling in all necessary fields based on publish options
 * @param {import('@playwright/test').Page} page
 * @param {PublishOptions} options
 */
const publishPost = async (page, {type = 'publish', time, date} = {}) => {
    await openPublishFlow(page);

    // set the publish type
    if (type) {
        // Type is nullable because pages don't have a publish type button
        await page.locator('[data-test-setting="publish-type"] > button').click();
        await page.locator(`[data-test-publish-type="${type}"] + label`).click({timeout: 1000}); // If this times out, it is likely that there are no members (running a single test).
    }

    const scheduleSummary = page.locator('[data-test-setting="publish-at"] [data-test-setting-title]');

    // Schedule the post
    if (date || time) {
        await page.locator('[data-test-setting="publish-at"] > button').click();
        await page.locator('[data-test-radio="schedule"] + label').click();
        // Wait for Ember to process the schedule toggle and update the summary
        await expect(scheduleSummary).not.toContainText('Right now');
    }

    if (date) {
        const textBefore = await scheduleSummary.textContent();
        await page.locator('[data-test-date-time-picker-date-input]').fill(date);
        await page.locator('[data-test-date-time-picker-date-input]').blur();
        // Wait for Ember to process the date change before continuing
        await expect(scheduleSummary).not.toContainText(textBefore.trim());
    }

    if (time) {
        await page.locator('[data-test-date-time-picker-time-input]').fill(time);
        await page.locator('[data-test-date-time-picker-time-input]').blur();
        // Allow Ember's run loop to process the time change
        await page.waitForTimeout(500);
    }

    // TODO: set other publish options

    // continue to confirmation step
    await page.locator('[data-test-modal="publish-flow"] [data-test-button="continue"]').click();

    // TODO: assert publish flow has expected confirmation details

    // (we need force because the button is animating)
    await page.locator('[data-test-modal="publish-flow"] [data-test-button="confirm-publish"]').click({force: true});

    // Wait for the publish flow to complete by checking the confirm button is no longer visible
    await page.locator('[data-test-modal="publish-flow"] [data-test-button="confirm-publish"]').waitFor({state: 'hidden'});
};

test.describe('Publishing', () => {
});

test.describe('Updating post access', () => {
    test('publish time in timezone', async ({page}) => {
        await page.goto('/ghost');

        await createPostDraft(page, {title: 'Published in timezones', body: 'Published in timezones'});
        await openPostSettingsMenu(page);

        // saves the post with the new date
        await expect(page.locator('[data-test-date-time-picker-timezone]')).toHaveText('UTC');
        await page.locator('[data-test-date-time-picker-datepicker]').click();
        await page.locator('.ember-power-calendar-nav-control--previous').click();
        await page.locator('.ember-power-calendar-day', {hasText: '15'}).click();
        const dateTimePickerInput = await page.locator('[data-test-date-time-picker-time-input]');
        dateTimePickerInput.fill('12:00');
        await page.keyboard.press('Tab');

        // test will not work if the field is not filled appropriately
        await expect(dateTimePickerInput).toHaveValue('12:00');

        await publishPost(page);
        await closePublishFlow(page);

        // go to settings and change the timezone
        await page.getByRole('navigation').getByRole('link', {name: 'Settings'}).click();
        await expect(page.getByTestId('timezone')).toContainText('UTC');

        await page.getByTestId('timezone-select').click();
        await page.locator('[data-testid="select-option"]', {hasText: 'Tokyo'}).click();

        await page.getByTestId('timezone').getByRole('button', {name: 'Save'}).click();
        await expect(page.getByTestId('timezone')).toContainText('(GMT +9:00) Osaka, Sapporo, Tokyo');

        await page.getByTestId('exit-settings').click();
        await page.getByRole('navigation').getByRole('link', {name: 'Posts'}).click();
        await page.locator('[data-test-post-id]', {hasText: /Published in timezones/}).click();

        await openPostSettingsMenu(page);

        await expect(page.locator('[data-test-date-time-picker-timezone]')).toHaveText('JST');
        await expect(page.locator('[data-test-date-time-picker-time-input]')).toHaveValue('21:00');
        await expect(page.locator('[data-test-date-time-picker-date-input]')).toHaveValue(/-15$/);
    });

    // Default recipient settings test moved to ghost/admin/tests/acceptance/editor/publish-flow-test.js
});

// Delete post tests moved to e2e/tests/admin/posts/publishing.test.ts
