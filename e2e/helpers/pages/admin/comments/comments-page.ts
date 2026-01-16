import {AdminPage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class CommentsPage extends AdminPage {
    readonly commentsList: Locator;
    readonly commentRows: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/comments';

        this.commentsList = page.getByTestId('comments-list');
        this.commentRows = page.getByTestId('comment-list-row');
    }

    async waitForComments(): Promise<void> {
        await this.commentsList.waitFor({state: 'visible'});
    }

    getCommentRowByText(text: string): Locator {
        return this.commentRows.filter({hasText: text});
    }

    getMoreMenuButton(row: Locator): Locator {
        return row.locator('button').last();
    }

    getViewPostMenuItem(): Locator {
        return this.page.getByRole('menuitem', {name: 'View post'});
    }

    getViewOnPostMenuItem(): Locator {
        return this.page.getByRole('menuitem', {name: 'View on post'});
    }

    async openMoreMenu(row: Locator): Promise<void> {
        await this.getMoreMenuButton(row).click();
    }
}
