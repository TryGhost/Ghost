import {AnalyticsOverviewPage, ContributorUserMenu, LoginPage, PostsPage, SidebarPage, SitePage} from '@/admin-pages';
import {Page} from '@playwright/test';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';

test.describe('Ghost Admin - Staff role smoke', () => {
    async function signInFirstTime(page: Page, account: {email: string; password: string}) {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.signIn(account.email, account.password);
    }

    async function expectNavigation(sidebarPage: SidebarPage, {visible, hidden}: {visible: string[]; hidden: string[]}) {
        await expect(sidebarPage.sidebar).toBeVisible();
        for (const name of visible) {
            await expect(sidebarPage.getNavLink(name)).toBeVisible();
        }
        for (const name of hidden) {
            await expect(sidebarPage.getNavLink(name)).toHaveCount(0);
        }
    }

    test('administrator first login - lands on analytics with full navigation', async ({browser, baseURL, ghostAccountAdministrator}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page}) => {
            await signInFirstTime(page, ghostAccountAdministrator);

            const analyticsPage = new AnalyticsOverviewPage(page);
            await expect(analyticsPage.header).toBeVisible();

            const sidebarPage = new SidebarPage(page);
            await expect(sidebarPage.adminSidebar).toBeVisible();
            await expectNavigation(sidebarPage, {
                visible: ['Analytics', 'View site', 'Posts', 'Pages', 'Tags', 'Members', 'Settings'],
                hidden: []
            });
        });
    });

    test('editor first login - lands on site view with content navigation', async ({browser, baseURL, ghostAccountEditor}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page}) => {
            await signInFirstTime(page, ghostAccountEditor);

            const sitePage = new SitePage(page);
            await sitePage.waitForPageToFullyLoad();

            await expectNavigation(new SidebarPage(page), {
                visible: ['Posts', 'Pages', 'Tags', 'Settings'],
                hidden: ['Analytics', 'View site', 'Members']
            });
        });
    });

    test('super editor first login - lands on site view with members navigation', async ({browser, baseURL, ghostAccountSuperEditor}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page}) => {
            await signInFirstTime(page, ghostAccountSuperEditor);

            const sitePage = new SitePage(page);
            await sitePage.waitForPageToFullyLoad();

            await expectNavigation(new SidebarPage(page), {
                visible: ['Posts', 'Pages', 'Tags', 'Members', 'Settings'],
                hidden: ['Analytics', 'View site']
            });
        });
    });

    test('author first login - lands on site view with posts and pages navigation', async ({browser, baseURL, ghostAccountAuthor}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page}) => {
            await signInFirstTime(page, ghostAccountAuthor);

            const sitePage = new SitePage(page);
            await sitePage.waitForPageToFullyLoad();

            await expectNavigation(new SidebarPage(page), {
                visible: ['Posts', 'Pages'],
                hidden: ['Analytics', 'View site', 'Tags', 'Members', 'Settings']
            });
        });
    });

    test('contributor first login - lands on posts list with floating user menu instead of sidebar', async ({browser, baseURL, ghostAccountContributor}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page}) => {
            await signInFirstTime(page, ghostAccountContributor);

            const postsPage = new PostsPage(page);
            await postsPage.waitForPageToFullyLoad();

            const sidebarPage = new SidebarPage(page);
            await expect(sidebarPage.adminSidebar).toHaveCount(0);

            const contributorMenu = new ContributorUserMenu(page);
            await contributorMenu.open();
            await expect(contributorMenu.postsMenuItem).toBeVisible();
            await expect(contributorMenu.viewSiteMenuItem).toBeVisible();
            await expect(contributorMenu.profileMenuItem).toBeVisible();
        });
    });
});
