import {Locator, Page, expect} from '@playwright/test';
import AdminPage from './AdminPage';

// Post item wrapper for better composability
export class PostItem {
    constructor(private locator: Locator, private page: Page) {}
    
    async exists(): Promise<boolean> {
        return this.locator.isVisible();
    }
    
    async assertVisible() {
        await expect(this.locator).toBeVisible();
    }
    
    async assertNotVisible() {
        await expect(this.locator).not.toBeVisible();
    }
    
    async getTitle(): Promise<string | null> {
        return this.locator.textContent();
    }
    
    async click() {
        await this.locator.click();
    }
    
    async hover() {
        await this.locator.hover();
    }
}

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
    
    // Composable methods for better assertions
    async getPost(index: number): Promise<PostItem> {
        await this.waitForPostsToLoad();
        const posts = await this.postItems.all();
        if (index >= posts.length) {
            throw new Error(`Post at index ${index} not found. Total posts: ${posts.length}`);
        }
        return new PostItem(posts[index], this.page);
    }
    
    async getPostByTitle(title: string): Promise<PostItem> {
        const postLocator = await this.findPostByTitle(title);
        if (!postLocator) {
            // Return a PostItem with a non-existent locator for consistent API
            return new PostItem(this.page.locator(`text="${title}"`), this.page);
        }
        return new PostItem(postLocator, this.page);
    }
    
    async assertPostExists(title: string) {
        const post = await this.getPostByTitle(title);
        await post.assertVisible();
    }
    
    async assertPostNotExists(title: string) {
        const post = await this.getPostByTitle(title);
        await post.assertNotVisible();
    }
}