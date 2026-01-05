import {FrameLocator, Locator, Page} from '@playwright/test';

export class CommentsSection {
    private readonly page: Page;
    readonly commentsFrame: FrameLocator;
    readonly commentsIframe: Locator;

    readonly ctaBox: Locator;
    readonly signUpButton: Locator;
    readonly signInButton: Locator;

    readonly mainForm: Locator;
    readonly editor: Locator;
    readonly submitButton: Locator;

    readonly commentCountText: Locator;
    readonly comments: Locator;
    readonly commentContent: Locator;

    readonly showMoreRepliesButton: Locator;
    readonly showMoreCommentsButton: Locator;
    readonly sortingButton: Locator;

    readonly cancelReplyButton: Locator;
    readonly addReplyButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.commentsIframe = this.page.locator('iframe[title="comments-frame"]');
        this.commentsFrame = this.page.frameLocator('iframe[title="comments-frame"]');

        // CTA box (shown when user is not logged in or cannot comment)
        this.ctaBox = this.commentsFrame.getByTestId('cta-box');
        this.signUpButton = this.commentsFrame.getByTestId('signup-button');
        this.signInButton = this.commentsFrame.getByTestId('signin-button');

        // Main form (shown when user can comment)
        this.mainForm = this.commentsFrame.getByTestId('main-form');
        this.editor = this.commentsFrame.getByTestId('editor');
        this.submitButton = this.commentsFrame.getByTestId('submit-form-button');

        this.commentCountText = this.commentsFrame.getByTestId('count');
        this.comments = this.commentsFrame.getByTestId('animated-comment');
        this.commentContent = this.commentsFrame.getByTestId('comment-content');
        this.showMoreRepliesButton = this.commentsFrame.getByTestId('reply-pagination-button');
        this.showMoreCommentsButton = this.commentsFrame.getByTestId('pagination-component');

        this.sortingButton = this.commentsFrame.getByRole('button', {name: /^(Best|Newest|Oldest)$/});

        this.cancelReplyButton = this.commentsFrame.getByRole('button', {name: 'Cancel'});
        this.addReplyButton = this.commentsFrame.getByRole('button', {name: 'Add reply'});
    }

    async sortBy(sorting: 'Best' | 'Newest' | 'Oldest'): Promise<void> {
        await this.sortingButton.click();
        await this.commentsFrame.getByRole('menuitem', {name: sorting}).click();
    }

    async waitForCommentsToLoad(): Promise<void> {
        await this.commentsIframe.waitFor({state: 'visible', timeout: 10000});
        await this.commentsFrame.getByTestId('content-box').waitFor({state: 'visible', timeout: 10000});
    }

    async writeComment(text: string): Promise<void> {
        await this.editor.focus();
        await this.editor.fill(text);
    }

    async submitComment(): Promise<void> {
        await this.submitButton.click();
    }

    async addComment(text: string): Promise<void> {
        await this.writeComment(text);
        await this.submitComment();
        await this.comments.waitFor({state: 'visible', timeout: 10000});
    }

    getCommentComponentByText(text: string): Locator {
        return this.getCommentByText(text).locator('../..');
    }

    getCommentByText(text: string): Locator {
        return this.commentsFrame
            .getByTestId('comment-content')
            .getByText(text, {exact: true});
    }

    async replyToComment(commentText: string, replyText: string): Promise<void> {
        const comment = this.getCommentComponentByText(commentText);
        await comment.getByRole('button', {name: 'Reply'}).click();
        await this.commentsFrame.getByTestId('reply-form').getByTestId('editor').fill(replyText);
        await this.addReplyButton.click();
    }

    async likeComment(text: string): Promise<void> {
        await this.getCommentByText(text).getByTestId('like-button').click();
    }
}
