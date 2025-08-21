import {Locator, Page} from '@playwright/test';
import {AdminPage} from '../../AdminPage';

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
    public readonly card: Locator;
    public readonly uniqueVisitors: Locator;
    public readonly viewMoreButton: Locator;

    constructor(page: Page) {
        super(page);

        this.card = this.page.getByTestId('web-performance');
        this.uniqueVisitors = this.card.getByTestId('unique-visitors');
        this.viewMoreButton = this.card.getByRole('button', {name: 'View more'});
    }
}

export class PostAnalyticsPage extends AdminPage {
    public readonly overviewButton: Locator;
    public readonly webTrafficButton: Locator;
    public readonly growthButton: Locator;

    public readonly growthSection: GrowthSection;
    public readonly webPerformanceSection: WebPerformanceSection;

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
        await this.webPerformanceSection.viewMoreButton.waitFor({state: 'visible'});
        await this.growthSection.viewMoreButton.waitFor({state: 'visible'});
    }

    async overview() {
        await this.overviewButton.click();
    };

    async webTraffic() {
        await this.webTrafficButton.click();
    }

    async growth() {
        await this.growthButton.waitFor({state: 'visible'});
        await this.growthButton.click();
    }
}

