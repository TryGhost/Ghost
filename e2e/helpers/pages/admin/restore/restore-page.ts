import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class RestorePage extends AdminPage {
    public readonly heading: Locator;
    public readonly emptyState: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/restore';

        this.heading = page.getByRole('heading', {name: 'Restore Posts'});
        this.emptyState = page.getByText('No local revisions found.');
    }

    revisionTitle(title: string): Locator {
        return this.page.getByRole('heading', {level: 3}).filter({hasText: title});
    }

    revisionRow(title: string): Locator {
        return this.page.getByRole('listitem').filter({has: this.revisionTitle(title)});
    }

    async restoreRevision(title: string) {
        await this.revisionRow(title).getByRole('button', {name: 'Restore'}).click();
    }
}
