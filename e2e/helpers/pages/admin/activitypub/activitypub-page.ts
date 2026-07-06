import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

/**
 * The admin-x-activitypub app ("Network" in the sidebar). The index route redirects
 * to the Reader/inbox view.
 *
 * Authored for the smoke gate: this app had no build-mode e2e coverage, so the goal
 * is a stable key-content locator to assert the view mounted without runtime errors.
 */
export class ActivityPubPage extends AdminPage {
    readonly readerNavLink: Locator;
    readonly inboxList: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/activitypub';

        // The sidebar "Reader" nav link is part of the ActivityPub app shell and is
        // present as soon as the React app mounts, independent of feed/empty state.
        this.readerNavLink = page.getByRole('link', {name: 'Reader'});
        // The inbox list renders once the reader feed (or its placeholder) is ready.
        this.inboxList = page.getByTestId('inbox-list');
    }

    async waitForAppToMount(): Promise<void> {
        await this.readerNavLink.waitFor({state: 'visible'});
    }
}
