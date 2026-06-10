import {LoginPage, PostsPage, TagsPage} from '@/admin-pages';
import {Page} from '@playwright/test';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';

/**
 * Signin screen tests, shared between the Ember implementation (labs flag
 * `authX` off) and the React implementation (`authX` on). Same page objects
 * and selectors for both runs.
 *
 * Session mechanics: the shared `page` fixture is auto-authenticated and its
 * session cookie is cached for later tests in the same file. Signing out only
 * clears the user from the server-side session (the session row survives), so
 * any test that logs the shared page out MUST sign back in before finishing.
 * Tests that need to end logged out run in an isolated browser context
 * instead.
 */
export function defineSigninTests() {
    // Resolving the shared authenticated page applies labs flags (set via
    // test.use) server-wide before tests that only use isolated contexts.
    test.beforeEach(async ({page}) => {
        // Resolving the shared page fixture applies labs flags server-wide.
        // Park it on a neutral authenticated URL: visiting /signin while
        // signed in triggers a client-side redirect whose async navigation
        // can clobber the test's own first navigation (the React screens
        // redirect via an effect, unlike Ember's synchronous beforeModel).
        await page.goto('/ghost/');
    });

    async function logout(page: Page) {
        const loginPage = new LoginPage(page);
        await loginPage.logout();
    }

    test('deep-linking to a React route while logged out redirects back after signin', async ({page, ghostAccountOwner}) => {
        await logout(page);

        const tagsPage = new TagsPage(page);
        await tagsPage.goto();

        const loginPage = new LoginPage(page);
        await expect(loginPage.signInButton).toBeVisible();

        await loginPage.signIn(ghostAccountOwner.email, ghostAccountOwner.password);

        await tagsPage.waitForPageToFullyLoad();
    });

    test('deep-linking to an Ember route while logged out redirects back after signin', async ({page, ghostAccountOwner}) => {
        await logout(page);

        const postsPage = new PostsPage(page);
        await postsPage.goto();

        const loginPage = new LoginPage(page);
        await expect(loginPage.signInButton).toBeVisible();

        await loginPage.signIn(ghostAccountOwner.email, ghostAccountOwner.password);

        await postsPage.waitForPageToFullyLoad();
    });

    test('query params on a deep link survive signin redirect', async ({page, ghostAccountOwner}) => {
        // Newsletter reply-to verification emails point at
        // /settings/newsletters/?verifyEmail=<token>. If the user clicks the
        // link in a browser that isn't signed in, the param needs to survive
        // the signin round-trip, otherwise the verify-on-mount handler in
        // newsletters.tsx no-ops and the customer thinks their reply-to
        // address didn't save (ONC-1618 / ONC-1642).
        await logout(page);

        await page.goto('/ghost/#/settings/newsletters/?verifyEmail=fake-token-xyz');

        const loginPage = new LoginPage(page);
        await expect(loginPage.signInButton).toBeVisible();

        await loginPage.signIn(ghostAccountOwner.email, ghostAccountOwner.password);

        // The error modal is the signal that the React verify handler ran:
        // it only renders when newsletters.tsx attempted to redeem a token
        // and the API rejected it (expected, since the token is fake).
        await expect(page.getByRole('heading', {name: 'Error verifying email address'})).toBeVisible();
        expect(page.url()).toContain('verifyEmail=fake-token-xyz');
    });

    test('signing in with a wrong password - shows error message', async ({browser, baseURL, ghostAccountOwner}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page}) => {
            const loginPage = new LoginPage(page);
            await loginPage.goto();

            await loginPage.signIn(ghostAccountOwner.email, 'definitely-wrong-password');

            // The sign-in button turns into "Retry" on failure, so the flow
            // notification is the stable signal that signin was rejected.
            await expect(loginPage.flowNotification).toContainText('Your password is incorrect.');
        });
    });

    test('submitting the signin form with empty fields - shows validation error', async ({browser, baseURL}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page}) => {
            const loginPage = new LoginPage(page);
            await loginPage.goto();

            await loginPage.signInButton.click();

            await expect(loginPage.flowNotification).toContainText('Please fill out the form to sign in.');
        });
    });
}
