const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createMember, createPostDraft} = require('../utils');

test.describe('Updating post access', () => {
    // Timezone display test moved to ghost/admin/tests/acceptance/editor/post-settings-menu-test.js

    test('default recipient settings - usually nobody', async ({page}) => {
        // switch to "usually nobody" setting
        await page.goto('/ghost/settings/newsletters');
        await page.getByTestId('default-recipients-select').click();
        await page.locator('[data-testid="select-option"]', {hasText: /Usually nobody/}).click();
        await page.getByTestId('default-recipients').getByRole('button', {name: 'Save'}).click();

        await expect(page.getByTestId('default-recipients')).toContainText('Usually nobody');

        await page.goto('/ghost');

        await createMember(page, {
            name: 'Test Member Recipient',
            email: 'test@recipient.com'
        });

        // go to publish a post
        await createPostDraft(page, {title: 'Published in timezones', body: 'Published in timezones'});
        await page.locator('[data-test-button="publish-flow"]').first().click();

        await expect(page.locator('[data-test-setting="publish-type"] [data-test-setting-title]')).toContainText('Publish');

        await expect(page.locator('[data-test-setting="email-recipients"] [data-test-setting-title]')).toContainText('Not sent as newsletter');

        await page.locator('[data-test-setting="publish-type"] [data-test-setting-title]').click();

        // email-related options are enabled
        await expect(page.locator('[data-test-publish-type="publish+send"]')).not.toBeDisabled();
        await expect(page.locator('[data-test-publish-type="send"]')).not.toBeDisabled();

        await page.locator('label[for="publish-type-publish+send"]').click();

        await expect(
            page.locator('[data-test-setting="email-recipients"] [data-test-setting-title]')
        ).toContainText(/\d+\s* subscriber/m);
    });
});

// Delete post tests moved to e2e/tests/admin/posts/publishing.test.ts
