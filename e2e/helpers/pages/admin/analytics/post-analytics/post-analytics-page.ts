import * as postAnalyticsSel from '@tryghost/test-data/selectors/post-analytics';
import { AdminPage } from '@/admin-pages';
import { Locator, Page } from '@playwright/test';

class GrowthSection extends AdminPage {
  readonly card: Locator;
  readonly viewMoreButton: Locator;

  constructor(page: Page) {
    super(page);

    this.card = this.page.getByTestId(postAnalyticsSel.growth);
    this.viewMoreButton = this.card.getByRole('button', { name: 'View more' });
  }
}

class WebPerformanceSection extends AdminPage {
  readonly card: Locator;
  readonly uniqueVisitors: Locator;
  readonly viewMoreButton: Locator;

  constructor(page: Page) {
    super(page);

    this.card = this.page.getByTestId(postAnalyticsSel.webPerformance);
    this.uniqueVisitors = this.card.getByTestId(postAnalyticsSel.uniqueVisitors);
    this.viewMoreButton = this.card.getByRole('button', { name: 'View more' });
  }
}

export class PostAnalyticsPage extends AdminPage {
  readonly overviewButton: Locator;
  readonly webTrafficButton: Locator;
  readonly growthButton: Locator;

  readonly growthSection: GrowthSection;
  readonly webPerformanceSection: WebPerformanceSection;

  constructor(page: Page) {
    super(page);
    this.pageUrl = '/ghost/#/analytics';

    this.overviewButton = this.page.getByRole('button', { name: postAnalyticsSel.overviewTab });
    this.webTrafficButton = this.page.getByRole('button', { name: postAnalyticsSel.webTrafficTab });
    this.growthButton = this.page.getByRole('button', { name: postAnalyticsSel.growthTab });

    this.growthSection = new GrowthSection(page);
    this.webPerformanceSection = new WebPerformanceSection(page);
  }

  async waitForPageLoad() {
    await this.webPerformanceSection.card.waitFor({ state: 'visible' });
  }
}
