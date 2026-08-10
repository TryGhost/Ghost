import {describe, expect, it} from 'vitest';

import {comment, fakeAdminEndpoint, fakeComments, member, renderAdminApp} from '@test-utils/acceptance';
import {commentsScreen} from './comments.screen';

function fakeMemberCommenting({canComment = true}: {canComment?: boolean} = {}) {
    const author = {...member({name: 'Test Member'}), can_comment: canComment};
    let entity = comment({
        html: '<p>Comment under moderation</p>',
        member: author,
        member_id: author.id
    });
    fakeComments(() => [entity]);

    const disableApi = fakeAdminEndpoint('POST', `/members/${author.id}/commenting/disable`, ({body}) => {
        const hideComments = (body as {hide_comments?: boolean}).hide_comments === true;
        author.can_comment = false;
        entity = {...entity, member: author, status: hideComments ? 'hidden' : entity.status};
        return {members: [author]};
    });
    const enableApi = fakeAdminEndpoint('POST', `/members/${author.id}/commenting/enable`, () => {
        author.can_comment = true;
        entity = {...entity, member: author};
        return {members: [author]};
    });

    return {commentId: entity.id, disableApi, enableApi};
}

async function openDisableDialog() {
    const row = commentsScreen.commentRow('Comment under moderation');
    await row.moreMenuButton().click();
    await commentsScreen.disableCommentingMenuItem().click();
    return {dialog: commentsScreen.disableCommentsDialog(), row};
}

describe('Disable member commenting', () => {
    it('offers the disable action for members who can comment', async () => {
        fakeMemberCommenting();
        await renderAdminApp('/comments');

        const row = commentsScreen.commentRow('Comment under moderation');
        await row.moreMenuButton().click();

        await expect.element(commentsScreen.disableCommentingMenuItem()).toBeVisible();
        await expect.element(commentsScreen.enableCommentingMenuItem()).not.toBeInTheDocument();
        await expect.element(row.commentingDisabledIndicator()).not.toBeInTheDocument();
    });

    it('shows the member and hide-comments option in the confirmation dialog', async () => {
        fakeMemberCommenting();
        await renderAdminApp('/comments');

        const {dialog} = await openDisableDialog();

        await expect.element(dialog).toHaveTextContent('Test Member');
        await expect.element(dialog).toHaveTextContent("won't be able to comment");
        await expect.element(dialog.getByRole('checkbox', {name: 'Hide all previous comments'})).toBeVisible();
        await expect.element(dialog.getByRole('button', {name: 'Disable comments'})).toBeVisible();
        await expect.element(dialog.getByRole('button', {name: 'Cancel'})).toBeVisible();
    });

    it('cancels without mutating and restores menu interactivity', async () => {
        const {disableApi} = fakeMemberCommenting();
        await renderAdminApp('/comments');

        const {dialog, row} = await openDisableDialog();
        await dialog.getByRole('button', {name: 'Cancel'}).click();
        await row.moreMenuButton().click();

        await expect.element(commentsScreen.disableCommentingMenuItem()).toBeVisible();
        expect(disableApi.requests).toHaveLength(0);
    });

    it('disables commenting without hiding existing comments', async () => {
        const {commentId, disableApi} = fakeMemberCommenting();
        await renderAdminApp('/comments');

        const {dialog, row} = await openDisableDialog();
        await dialog.getByRole('button', {name: 'Disable comments'}).click();

        await expect.poll(() => disableApi.lastRequest?.body).toEqual({
            reason: `Disabled from comment ${commentId}`,
            hide_comments: false
        });
        await expect.element(row.commentingDisabledIndicator()).toBeVisible();
        await expect.element(row).not.toHaveTextContent('Hidden');
        await row.moreMenuButton().click();
        await expect.element(commentsScreen.enableCommentingMenuItem()).toBeVisible();
        await expect.element(commentsScreen.disableCommentingMenuItem()).not.toBeInTheDocument();
    });

    it('hides existing comments when requested', async () => {
        const {commentId, disableApi} = fakeMemberCommenting();
        await renderAdminApp('/comments');

        const {dialog, row} = await openDisableDialog();
        await dialog.getByRole('checkbox', {name: 'Hide all previous comments'}).click();
        await dialog.getByRole('button', {name: 'Disable comments'}).click();

        await expect.poll(() => disableApi.lastRequest?.body).toEqual({
            reason: `Disabled from comment ${commentId}`,
            hide_comments: true
        });
        await expect.element(row.commentingDisabledIndicator()).toBeVisible();
        await expect.element(row).toHaveTextContent('Hidden');
    });

    it('shows the enable action for members with commenting disabled', async () => {
        fakeMemberCommenting({canComment: false});
        await renderAdminApp('/comments');

        const row = commentsScreen.commentRow('Comment under moderation');
        await expect.element(row.commentingDisabledIndicator()).toBeVisible();
        await row.moreMenuButton().click();

        await expect.element(commentsScreen.enableCommentingMenuItem()).toBeVisible();
        await expect.element(commentsScreen.disableCommentingMenuItem()).not.toBeInTheDocument();
    });

    it('re-enables commenting and restores the disable action', async () => {
        const {enableApi} = fakeMemberCommenting({canComment: false});
        await renderAdminApp('/comments');

        const row = commentsScreen.commentRow('Comment under moderation');
        await row.moreMenuButton().click();
        await commentsScreen.enableCommentingMenuItem().click();

        await expect.poll(() => enableApi.requests.length).toBe(1);
        await expect.element(row.commentingDisabledIndicator()).not.toBeInTheDocument();
        await row.moreMenuButton().click();
        await expect.element(commentsScreen.disableCommentingMenuItem()).toBeVisible();
    });
});
