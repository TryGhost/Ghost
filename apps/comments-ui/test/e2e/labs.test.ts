import {MockedApi, initialize} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Labs', async () => {
    test('Can toggle content based on Lab settings', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {
                testFlag: true
            }
        });

        await expect(frame.getByTestId('this-comes-from-a-flag')).toHaveCount(1);
    });

    test('test div is hidden if flag is not set', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {
                testFlag: false
            }
        });

        await expect(frame.getByTestId('this-comes-from-a-flag')).not.toBeVisible();
    });

    test('commentsThreads links to a focused thread at the maximum depth', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        const parentId = 'aaa0000000000000000000';
        const replyIds = [
            'aaa0000000000000000001',
            'aaa0000000000000000002',
            'aaa0000000000000000003',
            'aaa0000000000000000004',
            'aaa0000000000000000005',
            'aaa0000000000000000006'
        ];

        mockedApi.addComment({
            id: parentId,
            html: '<p>Parent comment</p>',
            replies: replyIds.map((id, index) => mockedApi.buildReply({
                id,
                html: `<p>Reply ${index + 1}</p>`,
                parent_id: parentId,
                ...(index > 0 ? {in_reply_to_id: replyIds[index - 1]} : {})
            })),
            count: {
                replies: replyIds.length
            }
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {
                commentsThreads: true
            }
        });

        await expect(frame.getByText('Reply 4')).toBeVisible();
        await expect(frame.getByText('Reply 5')).not.toBeVisible();

        await frame.getByTestId('continue-thread-button').click();

        await expect(page).toHaveURL(new RegExp(`#ghost-comments-${replyIds[4]}$`));
        await expect(frame.getByTestId('back-to-parent')).toBeVisible();
        await expect(frame.getByTestId('see-full-discussion')).toBeVisible();
        await expect(frame.getByText('Parent comment')).not.toBeVisible();
        await expect(frame.getByText('Reply 4')).toBeVisible();
        await expect(frame.getByText('Reply 5')).toBeVisible();
        await expect(frame.locator('mark')).toHaveCount(0);

        await page.goBack();

        await expect(page).not.toHaveURL(/#ghost-comments-/);
        await expect(frame.getByTestId('back-to-parent')).not.toBeVisible();
        await expect(frame.getByText('Reply 4')).toBeVisible();
        await expect(frame.getByText('Reply 5')).not.toBeVisible();

        await frame.getByTestId('continue-thread-button').click();

        await expect(page).toHaveURL(new RegExp(`#ghost-comments-${replyIds[4]}$`));
        await expect(frame.getByTestId('back-to-parent')).toBeVisible();

        await frame.getByTestId('back-to-parent').click();

        await expect(page).toHaveURL(new RegExp(`#ghost-comments-${replyIds[3]}$`));
        await expect(frame.getByText('Reply 4')).toBeVisible();
        await expect(frame.getByTestId('back-to-parent')).not.toBeVisible();
        await expect(frame.locator('mark')).toHaveCount(0);
    });

    test('commentsThreads uses a lower maximum depth on mobile', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        const parentId = 'ccc0000000000000000000';
        const replyIds = [
            'ccc0000000000000000001',
            'ccc0000000000000000002',
            'ccc0000000000000000003',
            'ccc0000000000000000004',
            'ccc0000000000000000005'
        ];

        mockedApi.addComment({
            id: parentId,
            html: '<p>Parent comment</p>',
            replies: replyIds.map((id, index) => mockedApi.buildReply({
                id,
                html: `<p>Mobile reply ${index + 1}</p>`,
                parent_id: parentId,
                ...(index > 0 ? {in_reply_to_id: replyIds[index - 1]} : {})
            })),
            count: {
                replies: replyIds.length
            }
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {
                commentsThreads: true
            }
        });

        await page.setViewportSize({width: 390, height: 1000});

        await expect(frame.getByText('Mobile reply 3')).toBeVisible();
        await expect(frame.getByText('Mobile reply 4')).not.toBeVisible();

        await frame.getByTestId('continue-thread-button').click();

        await expect(page).toHaveURL(new RegExp(`#ghost-comments-${replyIds[3]}$`));
        await expect(frame.getByText('Mobile reply 3')).toBeVisible();
        await expect(frame.getByText('Mobile reply 4')).toBeVisible();

        await frame.getByTestId('back-to-parent').click();

        await expect(page).toHaveURL(new RegExp(`#ghost-comments-${replyIds[2]}$`));
        await expect(frame.getByText('Mobile reply 3')).toBeVisible();
        await expect(frame.getByTestId('back-to-parent')).not.toBeVisible();
    });

    test('commentsThreads highlights a nested comment in the main list when linked', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        const parentId = 'bbb0000000000000000000';
        const replyId = 'bbb0000000000000000001';

        mockedApi.addComment({
            id: parentId,
            html: '<p>Parent comment</p>',
            replies: [
                mockedApi.buildReply({
                    id: replyId,
                    html: '<p>Nested reply</p>',
                    parent_id: parentId
                })
            ],
            count: {
                replies: 1
            }
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {
                commentsThreads: true
            }
        });

        await frame.locator(`a[href*="ghost-comments-${replyId}"]`).click();

        await expect(page).toHaveURL(new RegExp(`#ghost-comments-${replyId}$`));

        const parentComment = frame.locator(`[id="${parentId}"]`).getByTestId('comment-content').first();
        const nestedComment = frame.locator(`[id="${replyId}"]`).getByTestId('comment-content').first();

        await expect(parentComment.locator('mark')).toHaveCount(0);
        await expect(nestedComment.locator('mark')).toContainText('Nested reply');
    });
});
