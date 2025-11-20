import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';
import {WhatsNewModal} from './whats-new-modal';

export class WhatsNewMenu extends AdminPage {
    readonly userMenuTrigger: Locator;
    readonly whatsNewMenuItem: Locator;
    readonly avatarBadge: Locator;
    readonly menuBadge: Locator;

    constructor(page: Page) {
        super(page);

        // TODO: Remove .first() after React shell fully replaces Ember admin
        // During migration, both shells render the arrow-down icon
        this.userMenuTrigger = page.locator('[data-test-nav="arrow-down"]').first();
        this.whatsNewMenuItem = page.getByRole('menuitem', {name: /What’s new\?/i});
        // TODO: Remove .first() after React shell fully replaces Ember admin
        // During migration, both shells render badges - .first() selects React's
        this.avatarBadge = page.locator('[data-test-whats-new-avatar-badge]').first();
        this.menuBadge = page.locator('[data-test-whats-new-menu-badge]').first();
    }

    async openUserMenu(): Promise<void> {
        await this.userMenuTrigger.click();
        await this.whatsNewMenuItem.waitFor({state: 'visible'});
    }

    async openWhatsNewModal(): Promise<WhatsNewModal> {
        await this.openUserMenu();
        await this.whatsNewMenuItem.click();

        const modal = new WhatsNewModal(this.page);
        await modal.waitForModal();

        return modal;
    }
}
