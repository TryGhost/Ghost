import {test as setup, expect} from '@playwright/test';
import {LoginPage} from '../../e2e/helpers/pages/admin/LoginPage';
import {USER_ROLES, UserRoleKey} from '../helpers/auth-roles';
import * as path from 'path';

// Get the user role from environment variable (defaults to 'admin')
const userRole = (process.env.USER_ROLE || 'admin') as UserRoleKey;
const role = USER_ROLES[userRole];

const authFile = path.join(__dirname, '..', role.storageStatePath);

setup.describe('Authentication Setup', () => {
    setup(`authenticate as ${role.name}`, async ({page}) => {
        // Navigate to login page
        const loginPage = new LoginPage(page);
        await loginPage.goto();

        // Perform login
        await loginPage.signIn(role.email, role.password);

        // Wait for navigation to complete (should be redirected to dashboard)
        await page.waitForURL(/\/#\//, {timeout: 10000});

        // Save signed-in state
        await page.context().storageState({path: authFile});

        console.log(`✓ Authentication saved for ${role.name} at ${role.storageStatePath}`);
    });
});
