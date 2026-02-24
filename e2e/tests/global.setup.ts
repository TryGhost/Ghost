import logging from '@tryghost/logging';
import {AUTH_STATE_BY_ROLE, AUTH_STATE_DIR, StaffFixtureRole} from '@/helpers/utils/fixture-cache';
import {MailPit} from '@/helpers/services/email/mail-pit';
import {SettingsPage, SignupPage} from '@/helpers/pages';
import {createContextWithAuthState} from '@/helpers/playwright/context-with-auth-state';
import {ensureDir} from '@/helpers/utils/ensure-dir';
import {expect, test as setup} from '@playwright/test';
import {extractInvitationLink} from '@/helpers/services/email/utils';
import {getEnvironmentManager} from '@/helpers/environment';
import {loginToGetAuthenticatedSession} from '@/helpers/playwright/flows/sign-in';
import {setupUser} from '@/helpers/utils/setup-user';

const PASSWORD = 'test@123@test';
const OWNER = {
    name: 'Test Owner',
    email: 'owner@ghost.org',
    password: PASSWORD,
    blogTitle: 'Test Blog'
};

const staffRoles: Array<{role: StaffFixtureRole; name: string; email: string}> = [
    {role: 'administrator', name: 'Test Administrator', email: 'administrator@ghost.org'},
    {role: 'editor', name: 'Test Editor', email: 'editor@ghost.org'},
    {role: 'author', name: 'Test Author', email: 'author@ghost.org'},
    {role: 'contributor', name: 'Test Contributor', email: 'contributor@ghost.org'}
];

let shouldSkipFixtureCreation = false;
let inviteStartedAtMs = 0;

function getRequiredBaseURL(): string {
    const baseURL = process.env.E2E_BASE_URL;
    if (!baseURL) {
        throw new Error('E2E_BASE_URL is not set. Environment setup must run first.');
    }
    return baseURL;
}

setup.describe.configure({mode: 'serial'});

setup('setup environment', async () => {
    const manager = await getEnvironmentManager();
    const result = await manager.globalSetup();

    process.env.E2E_BASE_URL = result.baseUrl;
    shouldSkipFixtureCreation = result.cacheHit;

    logging.info(
        shouldSkipFixtureCreation
            ? 'Fixture cache hit - skipping user/auth setup'
            : 'Fixture cache miss - creating users/auth state and new snapshot'
    );
});

setup('create owner user', async ({browser}) => {
    setup.skip(shouldSkipFixtureCreation, 'Using cached fixture package');
    const baseURL = getRequiredBaseURL();

    await ensureDir(AUTH_STATE_DIR);
    await setupUser(baseURL, OWNER);

    const context = await createContextWithAuthState(browser, baseURL);
    const page = await context.newPage();

    await loginToGetAuthenticatedSession(page, OWNER.email, PASSWORD);
    await context.storageState({path: AUTH_STATE_BY_ROLE.owner});
    await context.close();
});

setup('invite staff users', async ({browser}) => {
    setup.skip(shouldSkipFixtureCreation, 'Using cached fixture package');
    const baseURL = getRequiredBaseURL();
    inviteStartedAtMs = Date.now();

    const context = await createContextWithAuthState(browser, baseURL, {
        role: 'owner'
    });
    const page = await context.newPage();
    const settingsPage = new SettingsPage(page);

    await settingsPage.goto();
    await settingsPage.staffSection.goto();

    for (const {email, role} of staffRoles) {
        await settingsPage.staffSection.inviteUser(email, role);
    }

    await context.close();
});

for (const {role, name, email} of staffRoles) {
    setup(`create ${role} user`, async ({browser}) => {
        setup.skip(shouldSkipFixtureCreation, 'Using cached fixture package');
        const baseURL = getRequiredBaseURL();
        const emailClient = new MailPit();

        const messages = await emailClient.searchByRecipient(email, {timeoutMs: 30000});
        const freshMessages = messages.filter((message) => {
            return Date.parse(message.Created) >= inviteStartedAtMs;
        });

        // eslint-disable-next-line playwright/no-standalone-expect
        expect(freshMessages.length).toBeGreaterThan(0);

        const newestMessage = freshMessages.sort((a, b) => {
            return Date.parse(b.Created) - Date.parse(a.Created);
        })[0];

        if (!newestMessage) {
            throw new Error(`No invitation message found for ${email}`);
        }

        const emailMessage = await emailClient.getMessageDetailed(newestMessage);
        const invitationLink = extractInvitationLink(emailMessage.HTML || emailMessage.Text);
        const signupUrl = invitationLink.startsWith('http')
            ? invitationLink
            : `${baseURL}${invitationLink}`;

        const context = await createContextWithAuthState(browser, baseURL);
        const page = await context.newPage();

        await page.goto(signupUrl);
        const signupPage = new SignupPage(page);
        await signupPage.nameField.waitFor({state: 'visible'});
        await signupPage.completeSignup(name, email, PASSWORD);

        await context.storageState({path: AUTH_STATE_BY_ROLE[role]});
        await context.close();
    });
}

setup('save database snapshot', async () => {
    setup.skip(shouldSkipFixtureCreation, 'Using cached fixture package');
    const manager = await getEnvironmentManager();
    await manager.createSnapshot();
});
