import sinon from 'sinon';
import {MOCKED_SITE_URL, MockedApi, initialize, mockAdminAuthFrame, mockAdminAuthFrame204} from '../utils/e2e';
import {buildReply} from '../utils/fixtures';
import {expect, test} from '@playwright/test';

const admin = MOCKED_SITE_URL + '/ghost/';

test.describe('Admin moderation', async () => {
    let mockedApi: MockedApi;

    test.beforeEach(async ({}) => {
        mockedApi = new MockedApi({});
    });

    type InitializeTestOptions = {
        isAdmin?: boolean;
        labs?: boolean;
        member?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    async function initializeTest(page, options: InitializeTestOptions = {}) {
        options = {isAdmin: true, labs: false, member: {id: '1', uuid: '12345'}, ...options};
        if (options.isAdmin) {
            await mockAdminAuthFrame({page, admin});
        } else {
            await mockAdminAuthFrame204({page, admin});
        }

        mockedApi.setMember(options.member);

        if (options.labs) {
            // enable specific labs flags here
        }

        return await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            title: 'Member discussion',
            count: true,
            admin,
            labs: {
                // enable specific labs flags here
            }
        });
    }

    test('skips rendering the auth frame with no comments', async ({page}) => {
        await initializeTest(page);

        const iframeElement = page.locator('iframe[data-frame="admin-auth"]');
        await expect(iframeElement).toHaveCount(0);
    });

    test('renders the auth frame when there are comments', async ({page}) => {
        mockedApi.addComment({html: '<p>This is comment 1</p>'});
        await initializeTest(page);

        const iframeElement = page.locator('iframe[data-frame="admin-auth"]');
        await expect(iframeElement).toHaveCount(1);
    });

    test('has no admin options when not signed in to Ghost admin or as member', async ({page}) => {
        mockedApi.addComment({html: '<p>This is comment 1</p>'});

        const {frame} = await initializeTest(page, {isAdmin: false, member: null});
        await expect(frame.getByTestId('more-button')).toHaveCount(0);
    });

    test('has no admin options when not signed in to Ghost admin but signed in as member', async ({page}) => {
        mockedApi.addComment({html: '<p>This is comment 1</p>'});

        const {frame} = await initializeTest(page, {isAdmin: false, member: {id: '2'}});
        // more button shows because it has a report button
        await expect(frame.getByTestId('more-button')).toHaveCount(1);

        await frame.getByTestId('more-button').nth(0).click();
        await expect(frame.getByTestId('hide-button')).not.toBeVisible();
    });

    test('has admin options when signed in to Ghost admin but not signed in as member', async ({page}) => {
        mockedApi.addComment({html: `<p>This is comment 1</p>`});
        const {frame} = await initializeTest(page, {member: null});

        const moreButtons = frame.getByTestId('more-button');
        await expect(moreButtons).toHaveCount(1);

        // Admin buttons should be visible
        await moreButtons.nth(0).click();
        await expect(frame.getByTestId('hide-button')).toBeVisible();
    });

    test('has admin options when signed in to Ghost admin and as a member', async ({page}) => {
        mockedApi.addComment({html: `<p>This is comment 1</p>`});
        const {frame} = await initializeTest(page);

        const moreButtons = frame.getByTestId('more-button');
        await expect(moreButtons).toHaveCount(1);

        // Admin buttons should be visible
        await moreButtons.nth(0).click();
        await expect(frame.getByTestId('hide-button')).toBeVisible();
    });

    test('member uuid are passed to admin browse api params', async ({page}) => {
        mockedApi.addComment({html: '<p>This is comment 1</p>'});
        const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');
        const {frame} = await initializeTest(page);
        const comments = await frame.getByTestId('comment-component');
        await expect(comments).toHaveCount(1);
        expect(adminBrowseSpy.called).toBe(true);
        const lastCall = adminBrowseSpy.lastCall.args[0];
        const url = new URL(lastCall.request().url());
        expect(url.searchParams.get('impersonate_member_uuid')).toBe('12345');
    });

    test('member uuid gets set when loading more comments', async ({page}) => {
        // create 25 comments
        for (let i = 0; i < 25; i++) {
            mockedApi.addComment({html: `<p>This is comment ${i}</p>`});
        }
        const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');
        const {frame} = await initializeTest(page);
        await frame.getByTestId('pagination-component').click();
        const lastCall = adminBrowseSpy.lastCall.args[0];
        const url = new URL(lastCall.request().url());
        expect(url.searchParams.get('impersonate_member_uuid')).toBe('12345');
    });

    test('member uuid gets set when changing order', async ({page}) => {
        mockedApi.addComment({
            html: '<p>This is the oldest</p>',
            created_at: new Date('2024-02-01T00:00:00Z')
        });
        mockedApi.addComment({
            html: '<p>This is comment 2</p>',
            created_at: new Date('2024-03-02T00:00:00Z')
        });
        mockedApi.addComment({
            html: '<p>This is the newest comment</p>',
            created_at: new Date('2024-04-03T00:00:00Z')
        });

        const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');
        const {frame} = await initializeTest(page);

        const sortingForm = await frame.getByTestId('comments-sorting-form');

        await sortingForm.click();

        const sortingDropdown = await frame.getByTestId(
            'comments-sorting-form-dropdown'
        );

        const optionSelect = await sortingDropdown.getByText('Newest');
        mockedApi.setDelay(100);
        await optionSelect.click();
        const lastCall = adminBrowseSpy.lastCall.args[0];
        const url = new URL(lastCall.request().url());
        expect(url.searchParams.get('impersonate_member_uuid')).toBe('12345');
    });

    test('member uuid gets set when loading more replies', async ({page}) => {
        mockedApi.addComment({
            html: '<p>This is comment 1</p>',
            replies: [
                buildReply({html: '<p>This is reply 1</p>'}),
                buildReply({html: '<p>This is reply 2</p>'}),
                buildReply({html: '<p>This is reply 3</p>'}),
                buildReply({html: '<p>This is reply 4</p>'}),
                buildReply({html: '<p>This is reply 5</p>'}),
                buildReply({html: '<p>This is reply 6</p>'})
            ]
        });

        const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'getReplies');
        const {frame} = await initializeTest(page);
        const comments = await frame.getByTestId('comment-component');
        const comment = comments.nth(0);
        await comment.getByTestId('reply-pagination-button').click();
        const lastCall = adminBrowseSpy.lastCall.args[0];
        const url = new URL(lastCall.request().url());
        expect(url.searchParams.get('impersonate_member_uuid')).toBe('12345');
    });

    test('member uuid gets set when reading a comment (after unhiding)', async ({page}) => {
        mockedApi.addComment({html: '<p>This is comment 1</p>'});
        mockedApi.addComment({html: '<p>This is comment 2</p>', status: 'hidden'});
        const adminReadSpy = sinon.spy(mockedApi.adminRequestHandlers, 'getOrUpdateComment');
        const {frame} = await initializeTest(page);
        const comments = await frame.getByTestId('comment-component');
        await expect(comments).toHaveCount(2);
        await expect(comments.nth(1)).toContainText('Hidden for members');
        const moreButtons = comments.nth(1).getByTestId('more-button');
        await moreButtons.click();
        await moreButtons.getByTestId('show-button').click();
        await expect(comments.nth(1)).not.toContainText('Hidden for members');

        const lastCall = adminReadSpy.lastCall.args[0];
        const url = new URL(lastCall.request().url());

        expect(url.searchParams.get('impersonate_member_uuid')).toBe('12345');
    });

    test('hidden comments are not displayed for non-admins', async ({page}) => {
        mockedApi.addComment({html: '<p>This is comment 1</p>'});
        mockedApi.addComment({html: '<p>This is comment 2</p>', status: 'hidden'});

        const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');

        const {frame} = await initializeTest(page, {isAdmin: false});
        const comments = await frame.getByTestId('comment-component');
        await expect(comments).toHaveCount(1);

        expect(adminBrowseSpy.called).toBe(false);
    });

    test('hidden comments are displayed for admins', async ({page}) => {
        mockedApi.addComment({html: '<p>This is comment 1</p>'});
        mockedApi.addComment({html: '<p>This is comment 2</p>', status: 'hidden'});

        const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');

        const {frame} = await initializeTest(page);
        const comments = await frame.getByTestId('comment-component');
        await expect(comments).toHaveCount(2);
        await expect(comments.nth(1)).toContainText('Hidden for members');

        expect(adminBrowseSpy.called).toBe(true);
    });

    test('can hide and show comments', async ({page}) => {
        [1,2].forEach(i => mockedApi.addComment({html: `<p>This is comment ${i}</p>`}));

        const {frame} = await initializeTest(page);
        const comments = await frame.getByTestId('comment-component');

        // Hide the 2nd comment
        const moreButtons = frame.getByTestId('more-button');
        await moreButtons.nth(1).click();
        await moreButtons.nth(1).getByText('Hide comment').click();

        const secondComment = comments.nth(1);
        await expect(secondComment).toContainText('Hidden for members');

        // Check can show it again
        await moreButtons.nth(1).click();
        await moreButtons.nth(1).getByText('Show comment').click();
        await expect(secondComment).toContainText('This is comment 2');
    });

    test('can hide and show replies', async ({page}) => {
        mockedApi.addComment({
            id: '1',
            html: '<p>This is comment 1</p>',
            replies: [
                buildReply({id: '2', html: '<p>This is reply 1</p>'}),
                buildReply({id: '3', html: '<p>This is reply 2</p>'})
            ]
        });

        const {frame} = await initializeTest(page);
        const comments = await frame.getByTestId('comment-component');
        const replyToHide = comments.nth(1);

        // Hide the 1st reply
        await replyToHide.getByTestId('more-button').click();
        await replyToHide.getByTestId('hide-button').click();

        await expect(replyToHide).toContainText('Hidden for members');

        // Show it again
        await replyToHide.getByTestId('more-button').click();
        await replyToHide.getByTestId('show-button').click();

        await expect(replyToHide).not.toContainText('Hidden for members');
    });

    test('updates in-reply-to snippets when hiding', async ({page}) => {
        mockedApi.addComment({
            id: '1',
            html: '<p>This is comment 1</p>',
            replies: [
                buildReply({id: '2', html: '<p>This is reply 1</p>'}),
                buildReply({id: '3', html: '<p>This is reply 2</p>', in_reply_to_id: '2', in_reply_to_snippet: 'This is reply 1'}),
                buildReply({id: '4', html: '<p>This is reply 3</p>'})
            ]
        });

        const {frame} = await initializeTest(page);
        const comments = await frame.getByTestId('comment-component');
        const replyToHide = comments.nth(1);
        const inReplyToComment = comments.nth(2);

        // Hide the 1st reply
        await replyToHide.getByTestId('more-button').click();
        await replyToHide.getByTestId('hide-button').click();

        await expect(inReplyToComment).toContainText('[removed]');
        await expect(inReplyToComment).not.toContainText('This is reply 1');

        // Show it again
        await replyToHide.getByTestId('more-button').click();
        await replyToHide.getByTestId('show-button').click();

        await expect(inReplyToComment).not.toContainText('[removed]');
        await expect(inReplyToComment).toContainText('This is reply 1');
    });

    test('has correct comments count', async ({page}) => {
        mockedApi.addComment({html: '<p>This is comment 1</p>', replies: [buildReply()]});
        mockedApi.addComment({html: '<p>This is comment 2</p>'});

        const {frame} = await initializeTest(page);
        await expect(frame.getByTestId('count')).toContainText('3 comments');
    });
});
