// Vendored from /e2e/helpers/pages/admin/whats-new — selectors identical.
import type {Locator, Page} from '@playwright/test';
import {AdminPage} from './pages';

export class WhatsNewBanner extends AdminPage {
    readonly container: Locator;
    readonly closeButton: Locator;
    readonly link: Locator;
    readonly title: Locator;
    readonly excerpt: Locator;

    constructor(page: Page) {
        super(page);

        this.container = page.getByRole('status', {name: /what’s new notification/i});
        this.closeButton = this.container.getByRole('button', {name: /dismiss/i});
        this.link = this.container.getByRole('link');
        this.title = this.container.locator('[data-test-toast-title]');
        this.excerpt = this.container.locator('[data-test-toast-excerpt]');
    }

    async dismiss(): Promise<void> {
        await this.closeButton.click();
        await this.container.waitFor({state: 'hidden'});
    }

    async clickLink(): Promise<void> {
        await this.link.click();
    }

    async clickLinkAndClosePopup(): Promise<void> {
        const [popup] = await Promise.all([
            this.page.waitForEvent('popup'),
            this.clickLink()
        ]);
        await popup.close();
    }

    async waitForBanner(): Promise<void> {
        await this.container.waitFor({state: 'visible'});
    }
}

interface ModalEntry {
    title: string;
    excerpt: string;
    hasImage: boolean;
}

export class WhatsNewModal {
    private readonly page: Page;
    readonly modal: Locator;
    readonly title: Locator;
    readonly entries: Locator;

    constructor(page: Page) {
        this.page = page;

        this.modal = page.getByRole('dialog', {name: /what’s new/i});
        this.title = this.modal.getByRole('heading', {name: /what’s new/i});
        this.entries = this.modal.locator('[data-test-entry]');
    }

    async waitForModal(): Promise<void> {
        await this.modal.waitFor({state: 'visible'});
    }

    async close(): Promise<void> {
        await this.page.keyboard.press('Escape');
        await this.modal.waitFor({state: 'hidden'});
    }

    async getEntries(): Promise<ModalEntry[]> {
        const entryElements = await this.entries.all();

        return Promise.all(
            entryElements.map(async (entry) => {
                const titleText = await entry.locator('[data-test-entry-title]').textContent();
                const excerptText = await entry.locator('[data-test-entry-excerpt]').textContent();
                const hasImage = await entry.locator('[data-test-entry-image]').count() > 0;

                return {
                    title: titleText?.trim() || '',
                    excerpt: excerptText?.trim() || '',
                    hasImage
                };
            })
        );
    }
}

export class WhatsNewMenu extends AdminPage {
    readonly userMenuTrigger: Locator;
    readonly whatsNewMenuItem: Locator;
    readonly avatarBadge: Locator;
    readonly menuBadge: Locator;

    constructor(page: Page) {
        super(page);

        this.userMenuTrigger = page.locator('[data-test-nav="arrow-down"]');
        this.whatsNewMenuItem = page.getByRole('menuitem', {name: /What’s new\?/i});
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
