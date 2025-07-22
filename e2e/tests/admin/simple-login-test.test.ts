import {test} from '@playwright/test';
import {LoginPage} from '../../helpers/pages/admin';

test.describe('Simple Login Test', () => {
    test('should login to Ghost admin', async ({page}) => {
        const loginPage = new LoginPage(page);
        
        // One-line login with assertion
        await loginPage.loginAndAssertSuccess('test+admin@test.com', 'P4ssw0rd123$');
    });
    
    test('should show error with invalid credentials', async ({page}) => {
        const loginPage = new LoginPage(page);
        
        // Try to login with invalid credentials
        await loginPage.goto();
        await loginPage.login('invalid@test.com', 'wrongpassword');
        
        // Assert login failed and error is shown
        await loginPage.assertLoginFailed();
        await loginPage.assertErrorMessage();
    });
});