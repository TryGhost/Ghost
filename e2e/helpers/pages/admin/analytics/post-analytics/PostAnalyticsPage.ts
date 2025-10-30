import {AdminPage} from '../../AdminPage';
import {Locator, Page} from '@playwright/test';

class GrowthSection extends AdminPage {
    readonly card: Locator;
    readonly viewMoreButton: Locator;

    constructor(page: Page) {
        super(page);

        this.card = this.page.getByTestId('growth');
        this.viewMoreButton = this.card.getByRole('button', {name: 'View more'});
    }
}

class WebPerformanceSection extends AdminPage {
    readonly card: Locator;
    readonly uniqueVisitors: Locator;
    readonly viewMoreButton: Locator;

    constructor(page: Page) {
        super(page);

        this.card = this.page.getByTestId('web-performance');
        this.uniqueVisitors = this.card.getByTestId('unique-visitors');
        this.viewMoreButton = this.card.getByRole('button', {name: 'View more'});
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

        this.overviewButton = this.page.getByRole('button', {name: 'Overview'});
        this.webTrafficButton = this.page.getByRole('button', {name: 'Web traffic'});
        this.growthButton = this.page.getByRole('button', {name: 'Growth'});

        this.growthSection = new GrowthSection(page);
        this.webPerformanceSection = new WebPerformanceSection(page);
    }

    async waitForPageLoad() {
        await this.webPerformanceSection.card.waitFor({state: 'visible'});
    }
}

