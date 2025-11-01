import {AdminPage} from '../AdminPage';
import {Locator, Page} from '@playwright/test';

export class PostsPage extends AdminPage {
    readonly postsList: Locator;
    readonly postsListItem: Locator;
    readonly newPostButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/posts';

        this.postsList = page.getByTestId('posts-list');
        this.postsListItem = this.postsList.getByTestId('posts-list-item');
        this.newPostButton = page.getByRole('link', {name: 'New post'});
    }

    getPostByTitle(title: string): Locator {
        return this.postsListItem.filter({has: this.page.getByRole('heading', {name: title, exact: true, level: 3})});
    }

    async refreshData() {
        await this.page.reload();
    }
}
