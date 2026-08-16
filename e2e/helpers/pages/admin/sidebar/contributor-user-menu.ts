import * as sidebarSel from '@tryghost/test-data/selectors/sidebar';
import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

/**
 * Contributors get a floating avatar menu instead of the admin sidebar
 * (apps/admin/src/layout/admin-layout.tsx).
 */
export class ContributorUserMenu extends AdminPage {
    public readonly trigger: Locator;
    public readonly postsMenuItem: Locator;
    public readonly viewSiteMenuItem: Locator;
    public readonly profileMenuItem: Locator;

    constructor(page: Page) {
        super(page);
        this.trigger = page.getByRole('button', {name: sidebarSel.contributorMenuTrigger});
        this.postsMenuItem = page.getByRole('menuitem', {name: sidebarSel.contributorPostsMenuItem});
        this.viewSiteMenuItem = page.getByRole('menuitem', {name: sidebarSel.contributorViewSiteMenuItem});
        this.profileMenuItem = page.getByRole('menuitem', {name: sidebarSel.profileMenuItem});
    }

    async open(): Promise<void> {
        await this.trigger.click();
    }
}
