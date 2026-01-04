import {CommentsSection} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';
import {PublicPage} from './public-page';

export class PostPage extends PublicPage {
    readonly postTitle: Locator;
    readonly postContent: Locator;
    readonly comments: CommentsSection;

    constructor(page: Page) {
        super(page);
        this.postTitle = page.locator('article h1').first();
        this.postContent = page.locator('article');
        this.comments = new CommentsSection(page);
    }

    async gotoPost(slug: string): Promise<void> {
        await this.goto(`/${slug}/`);
        await this.waitForPostToLoad();
    }

    async waitForPostToLoad(): Promise<void> {
        await this.postTitle.waitFor({state: 'visible'});
    }
}
