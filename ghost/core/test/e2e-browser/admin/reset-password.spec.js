const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const DataGenerator = require('../../utils/fixtures/data-generator');
const passwordReset = require('../../../core/server/services/auth/passwordreset');
const api = require('../../../core/server/api/endpoints/index');

test.describe('Admin', () => {
    test.describe('Reset Password', () => {
        test('Admin can reset password', async ({sharedPage}) => {
            // Logout
            const context = await sharedPage.context();
            await context.clearCookies();

            await sharedPage.goto('/ghost');

            // Add owner user data from usual fixture
            const ownerUser = DataGenerator.Content.users[0];

            await sharedPage.locator('#identification').fill(ownerUser.email);
            await sharedPage.getByRole('button', {name: 'Forgot?'}).click();

            await expect(sharedPage.locator(`text=An email with password reset instructions has been sent.`)).toBeVisible();
            const {resetToken} = await passwordReset.generateToken(ownerUser.email, api.settings);

            //Reset Password
            await sharedPage.goto(`/ghost/reset/${resetToken}/`);
            await expect(sharedPage.locator(`text=Reset your password.`)).toBeVisible();

            await sharedPage.locator('[data-test-nav="newPassword"]').fill('HiHello@123..');
            await sharedPage.locator('[data-test-nav="newPassword2"]').fill('HiHello@123..');
            await sharedPage.getByRole('button', {name: 'Save new password'}).click();

            await sharedPage.waitForLoadState('networkidle');
            await expect(sharedPage).toHaveURL(/\/ghost\/#\/analytics/);
        });

        test.describe('2FA Reset Password', () => {
            test('Admin can reset password with 2FA enabled', async ({sharedPage}) => {
                // Navigate to settings
                await sharedPage.goto('/ghost');
                await sharedPage.locator('[data-test-nav="settings"]').click();
                await sharedPage.waitForLoadState('networkidle');

                // Logout
                const context = await sharedPage.context();
                await context.clearCookies();

                await sharedPage.goto('/ghost');

                // Add owner user data from usual fixture
                const ownerUser = DataGenerator.Content.users[0];

                await sharedPage.locator('#identification').fill(ownerUser.email);
                await sharedPage.getByRole('button', {name: 'Forgot?'}).click();

                await expect(sharedPage.locator(`text=An email with password reset instructions has been sent.`)).toBeVisible();
                const {resetToken} = await passwordReset.generateToken(ownerUser.email, api.settings);

                //Reset Password
                await sharedPage.goto(`/ghost/reset/${resetToken}/`);
                await expect(sharedPage.locator(`text=Reset your password.`)).toBeVisible();

                await sharedPage.locator('[data-test-nav="newPassword"]').fill('HiHello@123..');
                await sharedPage.locator('[data-test-nav="newPassword2"]').fill('HiHello@123..');
                await sharedPage.getByRole('button', {name: 'Save new password'}).click();

                await sharedPage.waitForLoadState('networkidle');
                await expect(sharedPage).toHaveURL(/\/ghost\/#\/analytics/);
            });
        });
    });
});
