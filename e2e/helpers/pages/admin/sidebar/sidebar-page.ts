import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

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

    constructor(page: Page) {
        super(page);
        this.sidebar = page.getByRole('navigation');
        this.postsToggle = this.sidebar.getByRole('button', {name: /toggle post views/i});
        this.userDropdownTrigger = page.locator('[data-test-nav="arrow-down"]');
        this.nightShiftToggle = page.getByRole('button', {name: /dark mode/i}).or(page.getByRole('menuitem', {name: /dark mode/i}).getByRole('switch'));
        this.whatsNewButton = page.getByRole('menuitem', {name: /what's new/i});
        this.userProfileLink = page.getByRole('menuitem', {name: /your profile/i});
        this.signOutLink = page.getByRole('menuitem', {name: /sign out/i});

        // TODO: Remove .first() and .gh-nav-member-count after React shell fully replaces Ember admin
        this.networkNotificationBadge = this.sidebar
            .getByRole('listitem').filter({hasText: /network/i})
            .locator('[data-sidebar="menu-badge"], .gh-nav-member-count').first();
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
        // React uses a switch with aria-checked attribute
        const isChecked = await this.nightShiftToggle.getAttribute('aria-checked');
        if (isChecked !== null) {
            return isChecked === 'true';
        }
        // Ember uses a button with 'on' class
        const classes = await this.nightShiftToggle.getAttribute('class');
        return classes?.includes('on') ?? false;
    }

    async waitForNightShiftEnabled(enabled: boolean): Promise<void> {
        const locator = enabled
            ? this.page.locator('[aria-checked="true"], .nightshift-toggle.on')
            : this.page.locator('[aria-checked="false"], .nightshift-toggle:not(.on)');
        await locator.first().waitFor();
    }
}
