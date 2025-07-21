import {Locator, Page} from '@playwright/test';
import {TEST_ROUTES} from '@tryghost/admin-x-framework';
import AdminPage from '../AdminPage';

class GrowthSection extends AdminPage {
    private section: Locator;
    private readonly viewMoreButton: Locator;

    constructor(page: Page) {
        super(page);

        this.section = this.page.getByTestId('growth');
        this.viewMoreButton = this.section.getByRole('button', {name: 'View more'});
    }

    async viewMore() {
        await this.viewMoreButton.click();
    }
}

class WebPerformanceSection extends AdminPage {
    public readonly uniqueVisitors: Locator;

    constructor(page: Page) {
        super(page);

        this.uniqueVisitors = this.page.getByTestId('unique-visitors');
    }
}

export class PostAnalyticsPage extends AdminPage {
    private readonly overviewButton: Locator;
    private readonly webTrafficButton: Locator;
    private readonly growthButton: Locator;

    private readonly growthSection: GrowthSection;
    private readonly webPerformanceSection: WebPerformanceSection;
    private postId?: string;

    constructor(page: Page, postId?: string) {
        super(page);
        this.postId = postId;
        // If postId is provided, use the post-specific route, otherwise use the general analytics route
        this.pageUrl = postId ? TEST_ROUTES.POSTS_ANALYTICS.OVERVIEW(postId) : TEST_ROUTES.STATS.OVERVIEW;

        this.overviewButton = this.page.getByRole('button', {name: 'Overview'});
        this.webTrafficButton = this.page.getByRole('button', {name: 'Web traffic'});
        this.growthButton = this.page.getByRole('button', {name: 'Growth'});

        this.growthSection = new GrowthSection(page);
        this.webPerformanceSection = new WebPerformanceSection(page);
    }

    async overview() {
        await this.overviewButton.click();
    };

    async webTraffic() {
        await this.webTrafficButton.click();
    }

    async growth() {
        await this.growthButton.click();
    }
}

