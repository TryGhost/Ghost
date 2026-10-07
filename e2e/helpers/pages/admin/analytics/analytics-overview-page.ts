import * as analyticsSel from '@tryghost/test-data/selectors/analytics';
import { AdminPage } from '@/admin-pages';
import { BasePage } from '@/helpers/pages';
import { Locator, Page } from '@playwright/test';

class UniqueVisitorsGraph extends BasePage {
  public readonly graph: Locator;
  public readonly value: Locator;
  public readonly viewMoreButton: Locator;

  constructor(page: Page) {
    super(page);
    this.graph = page.getByTestId(analyticsSel.uniqueVisitors);
    this.value = this.graph.getByTestId(analyticsSel.kpiCardHeaderValue);
    this.viewMoreButton = this.graph.getByRole('button', { name: 'View more' });
  }

  async count() {
    return parseInt((await this.value.textContent()) || '0', 10);
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
    this.post = page.getByTestId(analyticsSel.latestPost);
    this.shareButton = this.post.getByRole('button', { name: 'Share post' });
    this.analyticsButton = this.post.getByRole('button', { name: 'Analytics' });

    this.visitors = this.post.getByTestId(analyticsSel.latestPostVisitors);
    this.members = this.post.getByTestId(analyticsSel.latestPostMembers);
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
    this.post = page.getByTestId(analyticsSel.topPostsCard);
  }

  async uniqueVisitorsStatistics() {
    return await this.post.getByTestId(analyticsSel.statisticsVisitors).textContent();
  }

  async membersStatistics() {
    return await this.post.getByTestId(analyticsSel.statisticsMembers).textContent();
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
    this.header = page.getByRole('heading', { name: 'Analytics' });

    this.membersGraph = page.getByTestId(analyticsSel.members);
    this.membersViewMoreButton = this.membersGraph.getByRole('button', { name: 'View more' });

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
