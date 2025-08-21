import {Locator, Page} from '@playwright/test';
import {AdminPage} from '../AdminPage';
import {BasePage} from '../../BasePage';

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
    private readonly uniqueVisitorsGraph: Locator;
    private readonly uniqueVisitorsViewMoreButton: Locator;
    private readonly membersGraph: Locator;
    private readonly membersViewMoreButton: Locator;

    public readonly latestPost: LatestPost;
    public readonly topPosts: TopPosts;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/analytics';
        this.header = page.getByRole('heading', {name: 'Analytics'});

        this.uniqueVisitorsGraph = page.getByTestId('Unique visitors');
        this.membersGraph = page.getByTestId('Members');
        this.uniqueVisitorsViewMoreButton = this.uniqueVisitorsGraph.getByRole('button', {name: 'View more'});
        this.membersViewMoreButton = this.membersGraph.getByRole('button', {name: 'View more'});

        this.latestPost = new LatestPost(page);
        this.topPosts = new TopPosts(page);
    }

    async viewMoreUniqueVisitorDetails() {
        return await this.uniqueVisitorsViewMoreButton.click();
    }

    async viewMoreMembersDetails() {
        return await this.membersViewMoreButton.click();
    }
}
