import {LoginPage, PostsPage, SitePage, TagsPage} from '@/admin-pages';
import {Page} from '@playwright/test';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.describe('Ghost Admin - Signin Redirect', () => {
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

    test('Contributor lands on the posts list immediately after signin', async ({page, ghostAccountContributor}) => {
        await logout(page);

        const navigationWarnings: string[] = [];
        page.on('console', (message) => {
            if (message.text().includes('Cannot update a component') && message.text().includes('Navigate')) {
                navigationWarnings.push(message.text());
            }
        });

        const loginPage = new LoginPage(page);
        await loginPage.signIn(ghostAccountContributor.email, ghostAccountContributor.password);

        const postsPage = new PostsPage(page);
        await postsPage.waitForPageToFullyLoad();
        expect(navigationWarnings).toEqual([]);
    });

    test('Author lands on the site page immediately after signin', async ({page, ghostAccountAuthor}) => {
        await logout(page);

        const navigationWarnings: string[] = [];
        page.on('console', (message) => {
            if (message.text().includes('Cannot update a component') && message.text().includes('Navigate')) {
                navigationWarnings.push(message.text());
            }
        });

        const loginPage = new LoginPage(page);
        await loginPage.signIn(ghostAccountAuthor.email, ghostAccountAuthor.password);

        const sitePage = new SitePage(page);
        await sitePage.waitForPageToFullyLoad();
        expect(navigationWarnings).toEqual([]);
    });
});
