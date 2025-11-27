import {expect, test as setup} from '@playwright/test';
import {getEnvironmentManager} from '@/helpers/environment';

const TIMEOUT = 2 * 60 * 1000; // 2 minutes
import * as path from 'path';
import {MailPit} from '@/helpers/services/email/mail-pit';
import {SettingsPage} from '@/helpers/pages';
import {SignupPage} from '@/helpers/pages/admin/signup-page';
import {createContextWithRoute} from '@/helpers/playwright/context-with-route';
import {ensureDir} from '@/helpers/utils/ensure-dir';
import {extractInvitationLink} from '@/helpers/services/email/utils';
import {setupUser} from '@/helpers/utils/setup-user';

const AUTH_STATE_DIR = path.join(process.cwd(), 'e2e', 'data', 'state', 'auth');
const PASSWORD = 'test@123@test';

// Setup environment first
setup('environment setup', async () => {
    const manager = await getEnvironmentManager();
    const result = await manager.globalSetup();
    
    // Store baseUrl for use in user setup tests
    // DevEnvironmentManager returns {baseUrl}, EnvironmentManager returns void
    if (result && typeof result === 'object' && 'baseUrl' in result) {
        process.env.E2E_BASE_URL = (result as {baseUrl: string}).baseUrl;
    } else {
        // Fallback to default or environment variable
        process.env.E2E_BASE_URL = process.env.GHOST_BASE_URL || 'http://localhost:2368';
    }
});

// Setup owner user
setup('setup owner user', async ({browser}) => {
    const backendURL = process.env.E2E_BASE_URL!;
    const ownerEmail = 'owner@ghost.org';

    await setupUser(backendURL, {
        name: 'Test Owner',
        email: ownerEmail,
        password: PASSWORD,
        blogTitle: 'Test Blog'
    });

    await ensureDir(AUTH_STATE_DIR);
    const context = await createContextWithRoute(browser, backendURL);
    const page = await context.newPage();
    
    await loginToGetAuthenticatedSession(page, ownerEmail, PASSWORD);
    
    await context.storageState({path: path.join(AUTH_STATE_DIR, 'owner.json')});
    await context.close();
});

// Invite and onboard staff members using parameterized tests
const staffRoles: Array<{role: 'administrator' | 'editor' | 'author' | 'contributor'; name: string; email: string}> = [
    {role: 'administrator', name: 'Test Administrator', email: 'administrator@ghost.org'},
    {role: 'editor', name: 'Test Editor', email: 'editor@ghost.org'},
    {role: 'author', name: 'Test Author', email: 'author@ghost.org'},
    {role: 'contributor', name: 'Test Contributor', email: 'contributor@ghost.org'}
];

for (const {role, name, email} of staffRoles) {
    setup(`invite ${role}`, async ({browser}) => {
        const backendURL = process.env.E2E_BASE_URL!;
        
        const context = await createContextWithRoute(browser, backendURL, {
            role: 'owner'
        });

        const page = await context.newPage();
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();
        await settingsPage.staffSection.goto();

        await settingsPage.staffSection.inviteUser(email, role);
        await context.close();
    });

    setup(`complete ${role} signup`, async ({browser}) => {
        const backendURL = process.env.E2E_BASE_URL!;
        const emailClient = new MailPit();

        const messages = await emailClient.searchByRecipient(email, {timeoutMs: 30000});
        expect(messages.length).toBeGreaterThan(0);

        const emailMessage = await emailClient.getMessageDetailed(messages[0]);
        const invitationLink = extractInvitationLink(emailMessage.HTML || emailMessage.Text);

        let signupUrl = invitationLink.startsWith('http') 
            ? invitationLink 
            : `${backendURL}${invitationLink}`;
        signupUrl = signupUrl.replace(/\/ghost\/signup\//, '/ghost/#/signup/');

        const context = await createContextWithRoute(browser, backendURL);
        const page = await context.newPage();
        
        await page.goto(signupUrl);
        const signupPage = new SignupPage(page);
        await signupPage.nameField.waitFor({state: 'visible'});

        await signupPage.completeSignup(name, PASSWORD);
        await context.close();
    });

    setup(`authenticate ${role}`, async ({browser}) => {
        const backendURL = process.env.E2E_BASE_URL!;

        const context = await createContextWithRoute(browser, backendURL);
        const page = await context.newPage();

        await loginToGetAuthenticatedSession(page, email, PASSWORD);
        
        await context.storageState({path: path.join(AUTH_STATE_DIR, `${role}.json`)});
        await context.close();
    });
}

// Create database snapshot after all users are onboarded
setup('create database snapshot', async () => {
    setup.setTimeout(TIMEOUT);
    const manager = await getEnvironmentManager();
    if ('createSnapshot' in manager && typeof manager.createSnapshot === 'function') {
        await manager.createSnapshot();
    }
});
