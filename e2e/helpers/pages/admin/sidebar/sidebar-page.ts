import * as sidebarSel from '@tryghost/test-data/selectors/sidebar';
import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';
import {whatsNewMenuItem} from '@tryghost/test-data/selectors/whats-new';

export type UserRole = 'Administrator' | 'Editor' | 'Author' | 'Contributor';

export interface NavItem {
    name: string;
    path: RegExp;
    directUrl: string;
    roles: UserRole[];
}

/**
 * Navigation items in the sidebar with their expected paths and role visibility.
 * Used for navigation tests and force upgrade redirect validation.
 */
export const NAV_ITEMS: NavItem[] = [
    {name: 'Analytics', path: /\/ghost\/#\/analytics\/?$/, directUrl: '/ghost/#/analytics', roles: ['Administrator']},
    {name: 'Network', path: /\/ghost\/#\/(network|activitypub)\/?/, directUrl: '/ghost/#/activitypub', roles: ['Administrator']},
    {name: 'View site', path: /\/ghost\/#\/site\/?$/, directUrl: '/ghost/#/site', roles: ['Administrator', 'Editor']},
    {name: 'Posts', path: /\/ghost\/#\/posts\/?$/, directUrl: '/ghost/#/posts', roles: ['Administrator', 'Editor', 'Author', 'Contributor']},
    {name: 'Pages', path: /\/ghost\/#\/pages\/?$/, directUrl: '/ghost/#/pages', roles: ['Administrator', 'Editor']},
    {name: 'Tags', path: /\/ghost\/#\/tags\/?$/, directUrl: '/ghost/#/tags', roles: ['Administrator', 'Editor']},
    {name: 'Members', path: /\/ghost\/#\/members\/?$/, directUrl: '/ghost/#/members', roles: ['Administrator', 'Editor']}
];

/**
 * SidebarPage uses semantic, accessibility-first locators.
 * This approach tests the UI as users interact with it, not implementation details.
 *
 * Accessibility features:
 * ✓ Active nav links have aria-current="page"
 * ✓ Posts toggle button has aria-expanded
 */
export class SidebarPage extends AdminPage {
    public readonly sidebar: Locator;
    public readonly postsToggle: Locator;
    public readonly userDropdownTrigger: Locator;
    public readonly appearanceMenuItem: Locator;
    public readonly themeLightOption: Locator;
    public readonly themeSystemOption: Locator;
    public readonly themeDarkOption: Locator;
    public readonly whatsNewButton: Locator;
    public readonly userProfileLink: Locator;
    public readonly signOutLink: Locator;
    public readonly networkNotificationBadge: Locator;
    public readonly ghostProLink: Locator;
    public readonly upgradeNowLink: Locator;
    public readonly themeErrorBanner: Locator;
    public readonly themeErrorDialog: Locator;

    constructor(page: Page) {
        super(page);
        this.sidebar = page.getByRole('navigation');
        this.postsToggle = this.sidebar.getByRole('button', {name: sidebarSel.postsToggle});
        this.userDropdownTrigger = page.getByRole('button', {name: sidebarSel.userMenuTrigger});
        this.appearanceMenuItem = page.getByRole('menuitem', {name: sidebarSel.appearanceMenuItem});
        this.themeLightOption = page.getByRole('menuitem', {name: sidebarSel.lightAppearanceOption});
        this.themeSystemOption = page.getByRole('menuitem', {name: sidebarSel.systemAppearanceOption});
        this.themeDarkOption = page.getByRole('menuitem', {name: sidebarSel.darkAppearanceOption});
        this.whatsNewButton = page.getByRole('menuitem', {name: whatsNewMenuItem});
        this.userProfileLink = page.getByRole('menuitem', {name: sidebarSel.profileMenuItem});
        this.signOutLink = page.getByRole('menuitem', {name: sidebarSel.signOutMenuItem});

        this.networkNotificationBadge = this.sidebar.getByTestId(sidebarSel.networkNotificationBadge);
        this.ghostProLink = this.sidebar.getByRole('link', {name: sidebarSel.ghostProLink});
        this.upgradeNowLink = this.sidebar.getByRole('link', {name: sidebarSel.upgradeNowLink});
        this.themeErrorBanner = page.getByRole('status').filter({hasText: sidebarSel.themeErrorsBannerText});
        this.themeErrorDialog = page.getByRole('dialog', {name: sidebarSel.themeErrorsDialog});
    }

    getNavLink(name: string): Locator {
        return this.sidebar
            .getByRole('link')
            .filter({hasText: new RegExp(name, 'i')});
    }

    getCustomViewColorIndicator(viewName: string): Locator {
        return this.getNavLink(viewName).locator('[data-color]');
    }

    async expandPostsSubmenu(): Promise<void> {
        const isExpanded = await this.postsToggle.getAttribute('aria-expanded');
        if (isExpanded !== 'true') {
            await this.postsToggle.click();
        }
    }

    async collapsePostsSubmenu(): Promise<void> {
        const isExpanded = await this.postsToggle.getAttribute('aria-expanded');
        if (isExpanded === 'true') {
            await this.postsToggle.click();
        }
    }

    async waitForDarkMode(enabled: boolean): Promise<void> {
        const locator = enabled
            ? this.page.locator('html.dark')
            : this.page.locator('html:not(.dark)');
        await locator.waitFor();
    }
}
