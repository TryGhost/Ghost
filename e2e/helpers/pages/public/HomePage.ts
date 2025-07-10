import {Page, Locator} from '@playwright/test';
import PublicPage from './PublicPage';

export class HomePage extends PublicPage {
    readonly title: Locator;
    readonly navigation: Locator;
    readonly posts: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/';
        this.title = page.locator('h1, .site-title');
        this.navigation = page.locator('.site-nav');
        this.posts = page.locator('.post-card');
    }

    async getPostCount() {
        return await this.posts.count();
    }

    async clickFirstPost() {
        await this.posts.first().click();
    }
}
