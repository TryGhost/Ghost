import {test} from '../../src/test-fixtures';

test.describe('Admin Login', () => {
    test('should allow login with environment variable credentials and 2FA',
        async ({loginPage, twoFactorAuthPage, dashboardPage}) => {
            await loginPage.goto();

            await loginPage.login();

            await twoFactorAuthPage.complete2FA();

            await dashboardPage.expectCurrentUrl();
        });
});
