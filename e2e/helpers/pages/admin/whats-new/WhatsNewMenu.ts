import {AdminPage} from '../AdminPage';
import {Locator, Page} from '@playwright/test';
import {WhatsNewModal} from './WhatsNewModal';

export class WhatsNewMenu extends AdminPage {
    readonly userMenuTrigger: Locator;
    readonly whatsNewMenuItem: Locator;
    readonly avatarBadge: Locator;
    readonly menuBadge: Locator;

    constructor(page: Page) {
        super(page);

        this.userMenuTrigger = page.locator('[data-test-nav="arrow-down"]');
        this.whatsNewMenuItem = page.getByRole('menuitem', {name: 'What’s new?'});
        this.avatarBadge = page.locator('[data-test-whats-new-avatar-badge]');
        this.menuBadge = page.locator('[data-test-whats-new-menu-badge]');
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
