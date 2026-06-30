import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class PostAnalyticsOverviewPage extends AdminPage {
    readonly giftLinkCard: Locator;
    readonly shareGiftLinkButton: Locator;
    readonly giftLinkVisitorsBadge: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/posts/analytics';

        this.giftLinkCard = page.getByTestId('gift-link-card');
        this.shareGiftLinkButton = this.giftLinkCard.getByRole('button', {name: 'Share'});
        // Badge inside the gift-link share modal showing the visitor count.
        this.giftLinkVisitorsBadge = page.getByTestId('gift-link-views');
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
}
