import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class PostsPage extends AdminPage {
    public readonly postsList: Locator;
    public readonly postsListItem: Locator;
    public readonly newPostButton: Locator;

    public readonly postsFilters: Locator;

    public readonly typeFilter: Locator;
    public readonly visibilityFilter: Locator;
    public readonly authorFilter: Locator;
    public readonly tagFilter: Locator;
    public readonly orderFilter: Locator;

    public readonly saveViewButton: Locator;
    public readonly editViewButton: Locator;

    public readonly pageTitle: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/posts';

        this.postsList = page.getByTestId('posts-list');
        this.postsListItem = this.postsList.getByTestId('posts-list-item');
        this.newPostButton = page.getByRole('link', {name: 'New post', exact: true});

        this.postsFilters = page.getByTestId('posts-filters');
        this.typeFilter = this.postsFilters.getByRole('button', {name: 'Type filter'});
        this.visibilityFilter = this.postsFilters.getByRole('button', {name: 'Visibility filter'});
        this.authorFilter = this.postsFilters.getByRole('button', {name: 'Author filter'});
        this.tagFilter = this.postsFilters.getByRole('button', {name: 'Tag filter'});
        this.orderFilter = this.postsFilters.getByRole('button', {name: 'Sort filter'});

        this.saveViewButton = page.getByRole('button', {name: /save as view/i});
        this.editViewButton = page.getByRole('button', {name: /edit current view/i});

        this.pageTitle = page.getByRole('heading', {level: 2});
    }

    getPostByTitle(title: string): Locator {
        // hasText (not an exact accessible-name match) because featured posts
        // prepend a "star-fill" icon to the heading's accessible name
        return this.postsListItem.filter({has: this.page.getByRole('heading', {level: 3}).filter({hasText: title})});
    }

    async waitForPageToFullyLoad() {
        await this.page.waitForURL(this.pageUrl);
        await this.postsList.waitFor({state: 'visible'});
    }

    async refreshData() {
        await this.page.reload();
    }

    async selectType(typeName: string): Promise<void> {
        await this.typeFilter.click();
        await this.page.getByRole('option', {name: typeName, exact: true}).click();
    }

    async selectVisibility(visibilityName: string): Promise<void> {
        await this.visibilityFilter.click();
        await this.page.getByRole('option', {name: visibilityName, exact: true}).click();
    }

    async selectAuthor(authorName: string): Promise<void> {
        await this.authorFilter.click();
        await this.page.getByRole('option', {name: authorName, exact: true}).click();
    }

    async selectTag(tagName: string): Promise<void> {
        await this.tagFilter.click();
        await this.page.getByRole('option', {name: tagName, exact: true}).click();
    }

    async selectOrder(orderName: string): Promise<void> {
        await this.orderFilter.click();
        await this.page.getByRole('option', {name: orderName, exact: true}).click();
    }

    async openSaveViewModal(): Promise<void> {
        await this.saveViewButton.waitFor({state: 'visible'});
        await this.saveViewButton.click();
    }

    async openEditViewModal(): Promise<void> {
        await this.editViewButton.waitFor({state: 'visible'});
        await this.editViewButton.click();
    }

    async getActiveViewName(): Promise<string | null> {
        return await this.pageTitle.textContent();
    }

    getPostStatus(title: string): Locator {
        return this.getPostByTitle(title).getByTestId('post-status');
    }

    // ---- multi-select + context menu (shared between Ember and React lists) ----

    get contextMenu(): Locator {
        return this.page.getByTestId('posts-context-menu');
    }

    contextMenuButton(name: string): Locator {
        return this.contextMenu.getByRole('button', {name});
    }

    get deletePostsModal(): Locator {
        return this.page.getByTestId('delete-posts-modal');
    }

    get unpublishPostsModal(): Locator {
        return this.page.getByTestId('unpublish-posts-modal');
    }

    get addTagsModal(): Locator {
        return this.page.getByTestId('add-tags-modal');
    }

    // The clickable selection target is the row wrapper (role=menuitem), which
    // overlays the inner list item element.
    getPostRow(title: string): Locator {
        return this.page.getByRole('menuitem').filter({has: this.page.getByRole('heading', {level: 3}).filter({hasText: title})});
    }

    async selectPost(title: string): Promise<void> {
        await this.getPostRow(title).click({modifiers: ['ControlOrMeta']});
    }

    async shiftSelectPost(title: string): Promise<void> {
        await this.getPostRow(title).click({modifiers: ['Shift']});
    }

    async openContextMenu(title: string): Promise<void> {
        await this.getPostRow(title).click({button: 'right'});
        await this.contextMenu.waitFor({state: 'visible'});
    }
}

export class PagesPage extends PostsPage {
    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/pages';
    }
}
