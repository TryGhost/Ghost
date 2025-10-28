import {chromium, FullConfig} from '@playwright/test';
import {LoginPage} from '../../e2e/helpers/pages/admin/LoginPage';
import {USER_ROLES, UserRoleKey} from './auth-roles';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
    // Get baseURL from the first project's use config or fallback to default
    const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:2368/ghost/';

    // Create .auth directory if it doesn't exist
    const authDir = path.join(__dirname, '..', '.auth');
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, {recursive: true});
    }

    // Get the roles to authenticate (default to 'admin' if not specified)
    const rolesToAuth = process.env.AUTH_ROLES
        ? process.env.AUTH_ROLES.split(',') as UserRoleKey[]
        : ['admin'] as UserRoleKey[];

    // Authenticate each role and save storage state
    for (const roleKey of rolesToAuth) {
        const role = USER_ROLES[roleKey];
        if (!role) {
            console.warn(`Unknown role: ${roleKey}, skipping...`);
            continue;
        }

        console.log(`Setting up authentication for ${role.name}...`);

        const browser = await chromium.launch();
        const context = await browser.newContext({baseURL});
        const page = await context.newPage();

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.signIn(role.email, role.password);

        // Wait for navigation to complete (should be redirected to dashboard)
        await page.waitForURL(/\/#\/dashboard/, {timeout: 10000});

        // Save signed-in state
        const storageStatePath = path.join(__dirname, '..', role.storageStatePath);
        await context.storageState({path: storageStatePath});

        console.log(`✓ Authentication saved for ${role.name} at ${role.storageStatePath}`);

        await browser.close();
    }
}

export default globalSetup;
