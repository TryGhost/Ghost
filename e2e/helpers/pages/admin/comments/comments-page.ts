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

    getDisableCommentingMenuItem(): Locator {
        return this.page.getByRole('menuitem', {name: 'Disable commenting'});
    }

    getEnableCommentingMenuItem(): Locator {
        return this.page.getByRole('menuitem', {name: 'Enable commenting'});
    }

    getDisableCommentsModal(): Locator {
        return this.page.getByRole('dialog');
    }

    getDisableCommentsModalTitle(): Locator {
        return this.getDisableCommentsModal().getByRole('heading', {name: 'Disable comments'});
    }

    getDisableCommentsButton(): Locator {
        return this.page.getByRole('button', {name: 'Disable comments'});
    }

    getCancelButton(): Locator {
        return this.getDisableCommentsModal().getByRole('button', {name: 'Cancel'});
    }

    getCommentingDisabledIndicator(row: Locator): Locator {
        return row.getByTestId('commenting-disabled-indicator');
    }

    getHideCommentsCheckbox(): Locator {
        return this.page.getByRole('checkbox', {name: 'Hide all previous comments'});
    }

    async openMoreMenu(row: Locator): Promise<void> {
        await this.getMoreMenuButton(row).click();
    }

    async clickDisableCommenting(): Promise<void> {
        await this.getDisableCommentingMenuItem().click();
    }

    async clickEnableCommenting(): Promise<void> {
        await this.getEnableCommentingMenuItem().click();
    }

    async confirmDisableCommenting(): Promise<void> {
        await this.getDisableCommentsButton().click();
    }
}
