import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export interface RestoreRevision {
    id: string;
    title: string;
    lexical: string;
    revisionTimestamp: number;
    type?: string;
    status?: string;
    slug?: string;
    excerpt?: string;
    authors?: Array<{id: string}>;
    tags?: unknown[];
}

export class RestorePage extends AdminPage {
    public readonly postTitle: Locator;
    public readonly restoreButton: Locator;
    public readonly emptyState: Locator;
    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/restore';
        this.postTitle = page.locator('[data-test-id="restore-post-title"]');
        this.restoreButton = page.locator('[data-test-id="restore-post-button"]');
        this.emptyState = page.getByText('No local revisions found.');
    }

    async waitFor() {
        await Promise.race([
            this.postTitle.first().waitFor({state: 'visible'}),
            this.emptyState.waitFor({state: 'visible'})
        ]);
    }

    async visit() {
        await this.goto(this.pageUrl, {waitUntil: 'load'});
        await this.waitFor();
    }

    async seedRevisionAndVisit(revision: RestoreRevision) {
        await this.visit();
        await this.page.evaluate((rev: RestoreRevision) => {
            const key = `post-revision-${rev.id}-${rev.revisionTimestamp}`;
            window.localStorage.setItem(key, JSON.stringify(rev));
        }, revision);
        await this.page.reload({waitUntil: 'load'});
        await this.waitFor();
    }
}
