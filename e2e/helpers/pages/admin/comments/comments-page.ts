import {AdminPage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class CommentsPage extends AdminPage {
    readonly commentsList: Locator;
    readonly commentRows: Locator;
    readonly viewPostMenuItem: Locator;
    readonly viewOnPostMenuItem: Locator;
    readonly viewMemberMenuItem: Locator;
    readonly disableCommentingMenuItem: Locator;
    readonly enableCommentingMenuItem: Locator;
    readonly disableCommentsModal: Locator;
    readonly disableCommentsModalTitle: Locator;
    readonly disableCommentsButton: Locator;
    readonly cancelButton: Locator;
    readonly commentingDisabledIndicator = (row: Locator) => row.getByTestId('commenting-disabled-indicator');
    readonly hideCommentsCheckbox: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/comments';

        this.commentsList = page.getByTestId('comments-list');
        this.commentRows = page.getByTestId('comment-list-row');
        this.viewPostMenuItem = page.getByRole('menuitem', {name: 'View post'});
        this.viewOnPostMenuItem = page.getByRole('menuitem', {name: 'View on post'});
        this.viewMemberMenuItem = page.getByRole('menuitem', {name: 'View member'});
        this.disableCommentingMenuItem = page.getByRole('menuitem', {name: 'Disable commenting'});
        this.enableCommentingMenuItem = page.getByRole('menuitem', {name: 'Enable commenting'});
        this.disableCommentsModal = page.getByRole('dialog');
        this.disableCommentsModalTitle = this.disableCommentsModal.getByRole('heading', {name: 'Disable comments'});
        this.disableCommentsButton = page.getByRole('button', {name: 'Disable comments'});
        this.cancelButton = this.disableCommentsModal.getByRole('button', {name: 'Cancel'});
        this.hideCommentsCheckbox = page.getByRole('checkbox', {name: 'Hide all previous comments'});
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

    async clickDisableCommenting(): Promise<void> {
        await this.disableCommentingMenuItem.click();
    }

    async clickEnableCommenting(): Promise<void> {
        await this.enableCommentingMenuItem.click();
    }

    async confirmDisableCommenting(): Promise<void> {
        await this.disableCommentsButton.click();
    }
}
