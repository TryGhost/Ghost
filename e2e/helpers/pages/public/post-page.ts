import {CommentsSection} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';
import {PublicPage} from './public-page';

export class PostPage extends PublicPage {
    readonly postTitle: Locator;
    readonly postContent: Locator;
    readonly postBody: Locator;
    readonly postHeader: Locator;
    readonly articleBody: Locator;
    readonly contentGateHeading: Locator;
    readonly contentGate: Locator;
    readonly metaDescription: Locator;
    readonly commentsSection: CommentsSection;
    readonly transistorCard: Locator;
    readonly transistorIframe: Locator;
    readonly transistorPlaceholder: Locator;

    constructor(page: Page) {
        super(page);
        this.postTitle = page.locator('article h1').first();
        this.postContent = page.locator('article.gh-article');
        this.postBody = page.locator('.gh-content.gh-canvas > p');
        this.postHeader = page.locator('main > article > header');
        this.articleBody = page.locator('main > article > section > p');
        this.contentGateHeading = page.locator('.gh-post-upgrade-cta-content h2');
        this.contentGate = page.locator('.gh-post-upgrade-cta-content');
        this.metaDescription = page.locator('meta[name="description"]');
        this.commentsSection = new CommentsSection(page);
        this.transistorCard = page.locator('.kg-transistor-card');
        this.transistorIframe = page.locator('iframe[data-kg-transistor-embed]');
        this.transistorPlaceholder = page.locator('.kg-transistor-placeholder');
    }

    async gotoPost(slug: string): Promise<void> {
        await this.goto(`/${slug}/`);
        await this.waitForPostToLoad();
    }

    async waitForPostToLoad(): Promise<void> {
        await this.postTitle.waitFor({state: 'visible'});
    }

    async waitForCommentsToLoad(): Promise<void> {
        await this.commentsSection.waitForCommentsToLoad();
    }
}
