import {Locator, Page} from '@playwright/test';
import AdminPage from './AdminPage';

export class PostsPage extends AdminPage {
    readonly postsContainer: Locator;
    readonly postItems: Locator;
    readonly searchInput: Locator;
    readonly newPostButton: Locator;
    readonly filterButtons: Locator;
    readonly publishedFilter: Locator;
    readonly draftFilter: Locator;
    readonly scheduledFilter: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/posts';
        this.postsContainer = page.locator('.posts-list, .content-list');
        this.postItems = page.locator('article, .post-list-item, [data-test-post]');
        this.searchInput = page.locator('input[type="search"], .search-input');
        this.newPostButton = page.locator('[data-test-button="new-post"], .new-post-button');
        this.filterButtons = page.locator('.filter-buttons, .view-actions');
        this.publishedFilter = page.locator('[data-test-filter="published"]');
        this.draftFilter = page.locator('[data-test-filter="draft"]');
        this.scheduledFilter = page.locator('[data-test-filter="scheduled"]');
    }

    async waitForPostsToLoad() {
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000); // Allow time for posts to render
    }

    async getPostCount(): Promise<number> {
        await this.waitForPostsToLoad();
        return await this.postItems.count();
    }

    async getAllPostTitles(): Promise<string[]> {
        await this.waitForPostsToLoad();
        return await this.postItems.allTextContents();
    }

    async findPostByTitle(title: string): Promise<Locator | null> {
        await this.waitForPostsToLoad();
        
        const selectors = [
            `text=${title}`,
            `text="${title}"`,
            `h3:has-text("${title}")`,
            `a:has-text("${title}")`,
            `[title="${title}"]`
        ];
        
        for (const selector of selectors) {
            const element = this.page.locator(selector);
            if (await element.isVisible()) {
                return element;
            }
        }
        
        return null;
    }

    async isPostVisible(title: string): Promise<boolean> {
        const post = await this.findPostByTitle(title);
        return post !== null;
    }

    async clickPost(title: string) {
        const post = await this.findPostByTitle(title);
        if (post) {
            await post.click();
        } else {
            throw new Error(`Post with title "${title}" not found`);
        }
    }

    async searchPosts(query: string) {
        await this.searchInput.fill(query);
        await this.page.waitForTimeout(500); // Wait for search to filter
    }

    async clickNewPost() {
        await this.newPostButton.click();
    }

    async filterByStatus(status: 'published' | 'draft' | 'scheduled') {
        switch (status) {
            case 'published':
                await this.publishedFilter.click();
                break;
            case 'draft':
                await this.draftFilter.click();
                break;
            case 'scheduled':
                await this.scheduledFilter.click();
                break;
        }
        await this.waitForPostsToLoad();
    }

    async refreshAndWait() {
        await this.page.reload();
        await this.waitForPostsToLoad();
    }
}