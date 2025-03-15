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
            const ownerUser = DataGenerator.Content.users.find(user => user.id === '1');

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
            await expect(sharedPage).toHaveURL(/\/ghost\/#\/dashboard/);
        });

        test.describe('2FA Reset Password', () => {
            test('Admin can reset password with 2FA enabled', async ({sharedPage}) => {
                // Navigate to settings
                await sharedPage.goto('/ghost');
                await sharedPage.locator('[data-test-nav="settings"]').click();
                await sharedPage.waitForLoadState('networkidle');

                // Make an API call to get settings
                const adminUrl = new URL(sharedPage.url()).origin + '/ghost';
                const settingsResponse = await sharedPage.request.get(`${adminUrl}/api/admin/settings/`);
                const settingsData = await settingsResponse.json();
                // Add staff2fa flag to labs settings
                const settings = settingsData.settings;
                const labsSetting = settings.find(s => s.key === 'labs');
                const labsValue = JSON.parse(labsSetting.value);
                labsValue.staff2fa = true;
                labsSetting.value = JSON.stringify(labsValue);

                // Update settings
                await sharedPage.request.put(`${adminUrl}/api/admin/settings/`, {
                    data: {
                        settings
                    }
                });

                // Logout
                const context = await sharedPage.context();
                await context.clearCookies();

                await sharedPage.goto('/ghost');

                // Add owner user data from usual fixture
                const ownerUser = DataGenerator.Content.users.find(user => user.id === '1');

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
                await expect(sharedPage).toHaveURL(/\/ghost\/#\/dashboard/);
            });
        });
    });
});
