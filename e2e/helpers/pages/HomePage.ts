import {Page, Locator} from '@playwright/test';

export class HomePage {
    private readonly page: Page;
    readonly title: Locator;
    readonly navigation: Locator;
    readonly posts: Locator;

    constructor(page: Page) {
        this.page = page;

        this.title = page.locator('h1, .site-title');
        this.navigation = page.locator('.site-nav');
        this.posts = page.locator('.post-card');
    }

    async goto() {
        await this.page.goto('/');
    }

    async getPostCount() {
        return await this.posts.count();
    }

    async clickFirstPost() {
        await this.posts.first().click();
    }
}
