import {Page, Locator} from '@playwright/test';
import PublicPage from './PublicPage';

export class HomePage extends PublicPage {
    readonly title: Locator;
    readonly mainSubscribeButton: Locator;

    private readonly latestPosts: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/';
        this.mainSubscribeButton = page.getByRole('button', {name: 'Subscribe'}).first();
        this.title = page.getByRole('heading', {level: 1});
        this.latestPosts = page.getByTestId('latest-posts');
    }

    async getLatestPosts() {
        const posts = await this.latestPosts.all();
        return await Promise.all(posts.map(async (post) => {
            return await post.innerText();
        }));
    }
}
