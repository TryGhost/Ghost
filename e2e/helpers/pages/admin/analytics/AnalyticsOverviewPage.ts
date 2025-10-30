import {AdminPage} from '../AdminPage';
import {BasePage} from '../../BasePage';
import {Locator, Page} from '@playwright/test';

class UniqueVisitorsGraph extends BasePage {
    public readonly graph: Locator;
    public readonly value: Locator;
    public readonly viewMoreButton: Locator;

    constructor(page: Page) {
        super(page);
        this.graph = page.getByTestId('Unique visitors');
        this.value = this.graph.getByTestId('kpi-card-header-value');
        this.viewMoreButton = this.graph.getByRole('button', {name: 'View more'});
    }

    async count() {
        return parseInt(await this.value.textContent() || '0', 10);
    }
}

class LatestPost extends BasePage {
    readonly post: Locator;
    readonly shareButton: Locator;
    readonly analyticsButton: Locator;
    private readonly visitors: Locator;
    private readonly members: Locator;

    constructor(page: Page) {
        super(page);
        this.post = page.getByTestId('latest-post');
        this.shareButton = this.post.getByRole('button', {name: 'Share post'});
        this.analyticsButton = this.post.getByRole('button', {name: 'Analytics'});

        this.visitors = this.post.getByTestId('latest-post-visitors');
        this.members = this.post.getByTestId('latest-post-members');
    }

    async postText() {
        return await this.post.textContent();
    }

    async visitorsCount() {
        return this.visitors.textContent();
    }

    async membersCount() {
        return await this.members.textContent();
    }
}

class TopPosts extends BasePage {
    public readonly post: Locator;

    constructor(page: Page) {
        super(page);
        this.post = page.getByTestId('top-posts-card');
    }

    async uniqueVisitorsStatistics() {
        return await this.post.getByTestId('statistics-visitors').textContent();
    }

    async membersStatistics() {
        return await this.post.getByTestId('statistics-members').textContent();
    }
}

export class AnalyticsOverviewPage extends AdminPage {
    public readonly header: Locator;
    private readonly membersGraph: Locator;
    private readonly membersViewMoreButton: Locator;

    public readonly uniqueVisitors: UniqueVisitorsGraph;
    public readonly latestPost: LatestPost;
    public readonly topPosts: TopPosts;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/analytics';
        this.header = page.getByRole('heading', {name: 'Analytics'});

        this.membersGraph = page.getByTestId('Members');
        this.membersViewMoreButton = this.membersGraph.getByRole('button', {name: 'View more'});

        this.uniqueVisitors = new UniqueVisitorsGraph(page);
        this.latestPost = new LatestPost(page);
        this.topPosts = new TopPosts(page);
    }

    async refreshData() {
        await this.page.reload();
    }

    async viewMoreUniqueVisitorDetails() {
        return await this.uniqueVisitors.viewMoreButton.click();
    }

    async viewMoreMembersDetails() {
        return await this.membersViewMoreButton.click();
    }
}
