import {test, expect} from '@playwright/test';
import {LoginPage} from '../../helpers/pages/admin';

test.describe('Simple Login Test', () => {
    test('should login to Ghost admin', async ({page}) => {
        const loginPage = new LoginPage(page);
        
        // Navigate to login page and perform login
        await loginPage.goto();
        await loginPage.login('test+admin@test.com', 'P4ssw0rd123$');
        
        // Check current URL
        const currentUrl = page.url();
        console.log('Current URL after login attempt:', currentUrl);
        
        // Check if there are any error messages
        const errorMessage = await loginPage.getErrorMessage();
        if (errorMessage) {
            console.log('Error message:', errorMessage);
        }
        
        // Check if we're logged in
        const isLoggedIn = await loginPage.isLoginSuccessful();
        console.log('Login successful:', isLoggedIn);
        
        // Assert login was successful
        expect(isLoggedIn).toBe(true);
        
        if (isLoggedIn) {
            console.log('✅ Login successful!');
        } else {
            console.log('❌ Login failed - still on signin page');
        }
    });
});