import * as postAnalyticsSel from '@tryghost/test-data/selectors/post-analytics';
import { AdminPage } from '@/admin-pages';
import { Locator, Page } from '@playwright/test';

export class PostAnalyticsOverviewPage extends AdminPage {
  public readonly giftLinkVisitorsBadge: Locator;
  public readonly giftLinkCardVisitors: Locator;
  private readonly giftLinkCard: Locator;
  private readonly shareGiftLinkButton: Locator;
  private readonly giftLinkUrlText: Locator;

  constructor(page: Page) {
    super(page);
    this.pageUrl = '/ghost/#/posts/analytics';

    this.giftLinkCard = page.getByTestId(postAnalyticsSel.giftLinkCard);
    this.shareGiftLinkButton = this.giftLinkCard.getByRole('button', { name: 'Share' });
    this.giftLinkVisitorsBadge = page.getByTestId(postAnalyticsSel.giftLinkViews);
    this.giftLinkCardVisitors = page.getByTestId(postAnalyticsSel.giftLinkCardVisitors);
    this.giftLinkUrlText = page.getByRole('dialog').getByText(/\?gift=/);
  }

  async gotoForPost(postId: string) {
    await this.goto(`/ghost/#/posts/analytics/${postId}`);
  }

  async openShareModal() {
    await this.shareGiftLinkButton.click();
  }

  // The share modal mints the link on open and swaps the "Generating link…"
  // placeholder for the real URL, so waiting for `?gift=` covers minting.
  async giftLinkUrl(): Promise<string> {
    await this.giftLinkUrlText.waitFor({ state: 'visible' });
    return await this.giftLinkUrlText.innerText();
  }
}
