import {AdminPage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';
import {commentListRow, commentsList} from '@tryghost/test-data/selectors/comments';

export class CommentsPage extends AdminPage {
    readonly commentsList: Locator;
    readonly commentRows: Locator;
    readonly viewOnPostMenuItem: Locator;
    readonly viewMemberMenuItem: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/comments';

        this.commentsList = page.getByTestId(commentsList);
        this.commentRows = page.getByTestId(commentListRow);
        this.viewOnPostMenuItem = page.getByRole('menuitem', {name: 'View on post'});
        this.viewMemberMenuItem = page.getByRole('menuitem', {name: 'View member'});
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

    async openMoreMenu(row: Locator): Promise<void> {
        await this.getMoreMenuButton(row).click();
    }
}
