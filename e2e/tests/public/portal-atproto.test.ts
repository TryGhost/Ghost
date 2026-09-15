/* eslint-disable ghost/sort-imports-es6-autofix/sort-imports-es6 */
import {randomUUID} from 'node:crypto';

import {HomePage, SignInPage} from '@/helpers/pages';
import {AtprotoNeedsEmailPage} from '@/helpers/pages/portal/atproto-needs-email-page';
import {MailPit} from '@/helpers/services/email/mail-pit';
import {extractMagicLink} from '@/helpers/services/email/utils';
import {createAtprotoTestDb, insertAtprotoOAuthState, MockAtprotoTokenServer} from '@/helpers/services/atproto/atproto-test-tools';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.use({
    config: {
        atproto__enabled: 'true'
    }
});

test.describe('Ghost Public - Portal ATProto', () => {
    let tokenServer: MockAtprotoTokenServer;
    let db: ReturnType<typeof createAtprotoTestDb>;

    test.beforeEach(async ({ghostInstance}) => {
        tokenServer = new MockAtprotoTokenServer();
        await tokenServer.start();
        db = createAtprotoTestDb(ghostInstance.database);
    });

    test.afterEach(async () => {
        await db.destroy();
        await tokenServer.stop();
    });

    async function seedLoginState(did: string) {
        return await insertAtprotoOAuthState(db, {
            did,
            tokenEndpoint: tokenServer.tokenEndpoint,
            asIssuer: tokenServer.issuer
        });
    }

    async function getCallbackRedirectLocation(request: any, baseUrl: string, stateId: string, code: string): Promise<string> {
        const response = await request.fetch(callbackUrl(baseUrl, stateId, code), {maxRedirects: 0});
        const location = response.headers().location;

        if (!location) {
            const body = await response.text();
            throw new Error(`ATProto callback did not return a redirect location (status ${response.status()}): ${body}`);
        }

        return location;
    }

    function extractPendingId(redirectLocation: string): string {
        const url = new URL(redirectLocation);
        const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
        const queryString = hash.includes('?') ? hash.split('?')[1] : url.searchParams.toString();
        const pending = new URLSearchParams(queryString).get('pending');

        if (!pending) {
            throw new Error(`Redirect location did not include a pending id: ${redirectLocation}`);
        }

        return pending;
    }

    function callbackUrl(baseUrl: string, stateId: string, code: string): string {
        const url = new URL('/members/atproto/callback', baseUrl);
        url.searchParams.set('code', code);
        url.searchParams.set('state', stateId);
        url.searchParams.set('iss', tokenServer.issuer);
        return url.toString();
    }

    async function expectSignedIn(page: HomePage): Promise<void> {
        await page.waitUntilLoaded();
        await expect(page.accountButton).toBeVisible();
    }

    test('users can sign in with a Bluesky account when ATProto login is enabled', async ({ghostInstance, page}) => {
        const homePage = new HomePage(page);
        await homePage.goto();
        await homePage.openPortalViaSignInLink();
        const portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');

        const signInPage = new SignInPage(page);
        await expect(signInPage.emailInput).toBeVisible();
        await expect(portalFrame.getByTestId('atproto-handle-input')).toBeVisible();
        await expect(portalFrame.getByRole('button', {name: 'Continue with Bluesky'})).toBeVisible();

        const did = `did:plc:${randomUUID().replace(/-/g, '')}`;
        const email = `atproto-login-${Date.now()}@example.com`;
        const code = `login-${Date.now()}`;

        tokenServer.setTokenResponse(code, {
            access_token: 'access-token',
            token_type: 'DPoP',
            sub: did,
            email,
            email_verified: true
        });

        const stateId = await seedLoginState(did);
        expect(await db('atproto_oauth_states').where({id: stateId}).first()).toBeTruthy();
        const redirectLocation = await getCallbackRedirectLocation(page.request, ghostInstance.baseUrl, stateId, code);
        await page.goto(redirectLocation);
        await expectSignedIn(homePage);

        const member = await db('members').where({email}).first();
        expect(member).toBeTruthy();
        expect(member.atproto_did).toBe(did);

        const subscriptions = await db('members_newsletters').where({member_id: member.id});
        expect(subscriptions.length).toBeGreaterThan(0);
    });

    test('updates the subscribed email when a linked Bluesky account signs in with a new email', async ({ghostInstance, page}) => {
        const homePage = new HomePage(page);
        await homePage.goto();

        const did = `did:plc:${randomUUID().replace(/-/g, '')}`;
        const firstEmail = `atproto-first-${Date.now()}@example.com`;
        const secondEmail = `atproto-second-${Date.now()}@example.com`;

        tokenServer.setTokenResponse('first-login', {
            access_token: 'access-token-1',
            token_type: 'DPoP',
            sub: did,
            email: firstEmail,
            email_verified: true
        });

        const firstStateId = await seedLoginState(did);
        expect(await db('atproto_oauth_states').where({id: firstStateId}).first()).toBeTruthy();
        const firstRedirectLocation = await getCallbackRedirectLocation(page.request, ghostInstance.baseUrl, firstStateId, 'first-login');
        await page.goto(firstRedirectLocation);
        await expectSignedIn(homePage);

        const initialMember = await db('members').where({email: firstEmail}).first();
        expect(initialMember).toBeTruthy();
        expect(initialMember.atproto_did).toBe(did);

        const initialSubscriptionCount = Number((await db('members_newsletters').where({member_id: initialMember.id}).count<{count: string}>({count: 'id'}))[0]?.count ?? 0);

        tokenServer.setTokenResponse('second-login', {
            access_token: 'access-token-2',
            token_type: 'DPoP',
            sub: did,
            email: secondEmail,
            email_verified: true
        });

        const secondStateId = await seedLoginState(did);
        const secondRedirectLocation = await getCallbackRedirectLocation(page.request, ghostInstance.baseUrl, secondStateId, 'second-login');
        await page.goto(secondRedirectLocation);
        await expectSignedIn(homePage);

        const updatedMember = await db('members').where({id: initialMember.id}).first();
        expect(updatedMember.email).toBe(secondEmail);
        expect(updatedMember.atproto_did).toBe(did);

        const updatedSubscriptionCount = Number((await db('members_newsletters').where({member_id: initialMember.id}).count<{count: string}>({count: 'id'}))[0]?.count ?? 0);
        expect(updatedSubscriptionCount).toBe(initialSubscriptionCount);
    });

    test('prompts for an email when a first-time Bluesky account has none, then completes sign up after validation', async ({ghostInstance, page}) => {
        const homePage = new HomePage(page);
        const emailClient = new MailPit();
        const did = `did:plc:${randomUUID().replace(/-/g, '')}`;
        const submittedEmail = `atproto-pending-${Date.now()}@example.com`;
        const code = `needs-email-${Date.now()}`;

        await homePage.goto();
        await homePage.openPortalViaSignInLink();

        tokenServer.setTokenResponse(code, {
            access_token: 'access-token',
            token_type: 'DPoP',
            sub: did
        });

        const stateId = await seedLoginState(did);
        expect(await db('atproto_oauth_states').where({id: stateId}).first()).toBeTruthy();
        const redirectLocation = await getCallbackRedirectLocation(page.request, ghostInstance.baseUrl, stateId, code);
        await page.goto(redirectLocation);

        const needsEmailPage = new AtprotoNeedsEmailPage(page);
        await expect(needsEmailPage.heading).toBeVisible();
        await expect(needsEmailPage.emailInput).toBeVisible();

        await needsEmailPage.emailInput.fill(submittedEmail);
        const pendingId = extractPendingId(redirectLocation);
        const submitResponse = await page.request.post('/members/atproto/needs-email', {
            data: {
                pending: pendingId,
                email: submittedEmail
            }
        });
        expect(submitResponse.ok()).toBe(true);

        const messages = await emailClient.searchByRecipient(submittedEmail, {timeoutMs: 10000});
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        const magicLink = extractMagicLink(latestMessage.Text, 'signup');

        await page.goto(magicLink);
        await expectSignedIn(homePage);

        const member = await db('members').where({email: submittedEmail}).first();
        expect(member).toBeTruthy();
        expect(member.atproto_did).toBe(did);

        const subscriptions = await db('members_newsletters').where({member_id: member.id});
        expect(subscriptions.length).toBeGreaterThan(0);
    });

    test('does not prompt for an email again when a validated Bluesky member already exists', async ({ghostInstance, page}) => {
        const homePage = new HomePage(page);
        const emailClient = new MailPit();
        const did = `did:plc:${randomUUID().replace(/-/g, '')}`;
        const validatedEmail = `atproto-validated-${Date.now()}@example.com`;

        await homePage.goto();
        await homePage.openPortalViaSignInLink();

        tokenServer.setTokenResponse('first-email-less-login', {
            access_token: 'access-token-1',
            token_type: 'DPoP',
            sub: did
        });

        const firstStateId = await seedLoginState(did);
        expect(await db('atproto_oauth_states').where({id: firstStateId}).first()).toBeTruthy();
        const firstRedirectLocation = await getCallbackRedirectLocation(page.request, ghostInstance.baseUrl, firstStateId, 'first-email-less-login');
        await page.goto(firstRedirectLocation);

        const needsEmailPage = new AtprotoNeedsEmailPage(page);
        await needsEmailPage.waitForPortalToOpen();
        await needsEmailPage.emailInput.fill(validatedEmail);
        const pendingId = extractPendingId(firstRedirectLocation);
        const submitResponse = await page.request.post('/members/atproto/needs-email', {
            data: {
                pending: pendingId,
                email: validatedEmail
            }
        });
        expect(submitResponse.ok()).toBe(true);

        const messages = await emailClient.searchByRecipient(validatedEmail, {timeoutMs: 10000});
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        const magicLink = extractMagicLink(latestMessage.Text, 'signup');

        await page.goto(magicLink);
        await expectSignedIn(homePage);

        const member = await db('members').where({email: validatedEmail}).first();
        expect(member).toBeTruthy();
        expect(member.atproto_did).toBe(did);

        const subscriptionsBefore = Number((await db('members_newsletters').where({member_id: member.id}).count<{count: string}>({count: 'id'}))[0]?.count ?? 0);

        tokenServer.setTokenResponse('second-email-less-login', {
            access_token: 'access-token-2',
            token_type: 'DPoP',
            sub: did
        });

        const secondStateId = await seedLoginState(did);
        const secondRedirectLocation = await getCallbackRedirectLocation(page.request, ghostInstance.baseUrl, secondStateId, 'second-email-less-login');
        await page.goto(secondRedirectLocation);

        await expectSignedIn(homePage);
        await expect(page).not.toHaveURL(/atprotoNeedsEmail/);

        const updatedMember = await db('members').where({id: member.id}).first();
        expect(updatedMember.email).toBe(validatedEmail);
        expect(updatedMember.atproto_did).toBe(did);

        const subscriptionsAfter = Number((await db('members_newsletters').where({member_id: member.id}).count<{count: string}>({count: 'id'}))[0]?.count ?? 0);
        expect(subscriptionsAfter).toBe(subscriptionsBefore);
    });
});