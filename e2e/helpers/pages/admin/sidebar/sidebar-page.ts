import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

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
    public readonly nightShiftToggle: Locator;
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
        this.postsToggle = this.sidebar.getByRole('button', {name: /toggle post views/i});
        this.userDropdownTrigger = page.locator('[data-test-nav="arrow-down"]');
        this.nightShiftToggle = page.getByRole('menuitem', {name: /dark mode/i}).getByRole('switch');
        this.whatsNewButton = page.getByRole('menuitem', {name: /what's new/i});
        this.userProfileLink = page.getByRole('menuitem', {name: /your profile/i});
        this.signOutLink = page.getByRole('menuitem', {name: /sign out/i});

        this.networkNotificationBadge = this.sidebar
            .getByRole('listitem').filter({hasText: /network/i})
            .locator('[data-sidebar="menu-badge"]');
        this.ghostProLink = this.sidebar.getByRole('link', {name: 'Ghost(Pro)'});
        this.upgradeNowLink = this.sidebar.getByRole('link', {name: /upgrade/i});
        this.themeErrorBanner = page.getByRole('status').filter({hasText: /your theme has errors/i});
        this.themeErrorDialog = page.getByRole('dialog').filter({hasText: /theme errors/i});
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

    async isNightShiftEnabled(): Promise<boolean> {
        const isChecked = await this.nightShiftToggle.getAttribute('aria-checked');
        return isChecked === 'true';
    }

    async waitForNightShiftEnabled(enabled: boolean): Promise<void> {
        const locator = enabled
            ? this.page.locator('[aria-checked="true"]')
            : this.page.locator('[aria-checked="false"]');
        await locator.waitFor();
    }
}
