import {test} from '@playwright/test';
import {gotoLogin} from '../../helpers';

test.describe('Simple Login Test', () => {
    test('should login to Ghost admin as owner', async ({page}) => {
        // Navigate and get page object in one step
        const loginPage = await gotoLogin(page);
        
        // Perform login with role-based method
        await loginPage.loginAsOwner();
    });
    
    test('should show error with invalid password', async ({page}) => {
        const loginPage = await gotoLogin(page);
        
        // Explicit failure scenario
        await loginPage.attemptLoginWithInvalidPassword();
    });
    
    test('should show error for non-existent user', async ({page}) => {
        const loginPage = await gotoLogin(page);
        
        // Another explicit failure scenario
        await loginPage.attemptLoginWithNonexistentUser();
    });
});