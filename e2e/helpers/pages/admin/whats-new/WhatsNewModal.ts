import {Locator, Page} from '@playwright/test';

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
