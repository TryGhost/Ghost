import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class PostAnalyticsOverviewPage extends AdminPage {
    readonly giftLinkCard: Locator;
    readonly shareGiftLinkButton: Locator;
    readonly giftLinkVisitorsBadge: Locator;
    readonly giftLinkCardVisitors: Locator;
    readonly copyGiftLinkButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/posts/analytics';

        this.giftLinkCard = page.getByTestId('gift-link-card');
        this.shareGiftLinkButton = this.giftLinkCard.getByRole('button', {name: 'Share'});
        this.giftLinkVisitorsBadge = page.getByTestId('gift-link-views');
        this.giftLinkCardVisitors = page.getByTestId('gift-link-card-visitors');
        this.copyGiftLinkButton = page.getByTestId('copy-gift-link');
    }

    setPostId(postId: string) {
        this.pageUrl = `/ghost/#/posts/analytics/${postId}`;
    }

    async gotoForPost(postId: string) {
        this.setPostId(postId);
        await this.goto();
    }

    async openShareModal() {
        await this.shareGiftLinkButton.click();
    }

    // Analytics is a hash route, so re-navigating to it is a same-document change
    // that won't refetch; reload to pull freshly ingested data.
    async refreshData() {
        await this.page.reload();
    }

    /**
     * Copy the gift link from the share modal the way a user would, then read it
     * back off the clipboard. The button is disabled until the link is minted, so
     * the click auto-waits for a real URL; the clipboard write is async, so poll
     * until it lands before reading. Requires clipboard permissions on the context.
     */
    async copyGiftLinkUrl(): Promise<string> {
        await this.copyGiftLinkButton.click();
        await this.page.waitForFunction(async () => (await navigator.clipboard.readText()).includes('?gift='));
        return this.page.evaluate(() => navigator.clipboard.readText());
    }
}
