import {LoginPage, PostsPage, TagsPage} from '@/admin-pages';
import {Page} from '@playwright/test';
import {expect, test} from '@/helpers/playwright';

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
});
