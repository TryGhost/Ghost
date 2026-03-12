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

    test('always renders the auth frame', async ({page}) => {
        // Auth frame should render even with no comments - admin status must be
        // resolved before fetching comments to use the correct API endpoint
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
        // Admin browse happens asynchronously after public browse + admin auth.
        // May re-fetch when member overlay arrives with the UUID, so poll until
        // the last call includes the expected impersonate_member_uuid.
        await expect.poll(() => {
            if (!adminBrowseSpy.called) {
                return null;
            }
            const url = new URL(adminBrowseSpy.lastCall.args[0].request().url());
            return url.searchParams.get('impersonate_member_uuid');
        }).toBe('12345');
    });

    test('member uuid gets set when loading more comments', async ({page}) => {
        // create 25 comments
        for (let i = 0; i < 25; i++) {
            mockedApi.addComment({html: `<p>This is comment ${i}</p>`});
        }
        const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');
        const {frame} = await initializeTest(page);
        // Wait for admin browse with member UUID (may take two fetches if admin
        // auth resolves before member overlay)
        await expect.poll(() => {
            if (!adminBrowseSpy.called) {
                return null;
            }
            const url = new URL(adminBrowseSpy.lastCall.args[0].request().url());
            return url.searchParams.get('impersonate_member_uuid');
        }).toBe('12345');
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
        // Wait for admin browse with member UUID
        await expect.poll(() => {
            if (!adminBrowseSpy.called) {
                return null;
            }
            const url = new URL(adminBrowseSpy.lastCall.args[0].request().url());
            return url.searchParams.get('impersonate_member_uuid');
        }).toBe('12345');

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
        const allReplies = [
            buildReply({html: '<p>This is reply 1</p>'}),
            buildReply({html: '<p>This is reply 2</p>'}),
            buildReply({html: '<p>This is reply 3</p>'}),
            buildReply({html: '<p>This is reply 4</p>'}),
            buildReply({html: '<p>This is reply 5</p>'}),
            buildReply({html: '<p>This is reply 6</p>'})
        ];

        mockedApi.addComment({
            html: '<p>This is comment 1</p>',
            replies: allReplies
        });

        // Override browseComments to only return 3 replies (simulating API limit)
        // while count.replies stays at 6, forcing a separate getReplies call
        const originalBrowse = mockedApi.browseComments.bind(mockedApi);
        mockedApi.browseComments = function (options) {
            const result = originalBrowse(options);
            result.comments = result.comments.map((c) => {
                if (c.replies.length > 3) {
                    return {...c, replies: c.replies.slice(0, 3)};
                }
                return c;
            });
            return result;
        };

        const adminBrowseCommentsSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');
        const adminRepliesSpy = sinon.spy(mockedApi.adminRequestHandlers, 'getReplies');
        const {frame} = await initializeTest(page);
        // Wait for admin browse with member UUID
        await expect.poll(() => {
            if (!adminBrowseCommentsSpy.called) {
                return null;
            }
            const url = new URL(adminBrowseCommentsSpy.lastCall.args[0].request().url());
            return url.searchParams.get('impersonate_member_uuid');
        }).toBe('12345');
        const comments = await frame.getByTestId('comment-component');
        const comment = comments.nth(0);
        await comment.getByTestId('reply-pagination-button').click();
        await expect.poll(() => {
            if (!adminRepliesSpy.called) {
                return null;
            }
            const url = new URL(adminRepliesSpy.lastCall.args[0].request().url());
            return url.searchParams.get('impersonate_member_uuid');
        }).toBe('12345');
    });


    test('member uuid gets set when reading a comment (after unhiding)', async ({page}) => {
        mockedApi.addComment({html: '<p>This is comment 1</p>'});
        mockedApi.addComment({html: '<p>This is comment 2</p>', status: 'hidden'});
        const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');
        const adminReadSpy = sinon.spy(mockedApi.adminRequestHandlers, 'getOrUpdateComment');
        const {frame} = await initializeTest(page);
        // Wait for admin browse with member UUID
        await expect.poll(() => {
            if (!adminBrowseSpy.called) {
                return null;
            }
            const url = new URL(adminBrowseSpy.lastCall.args[0].request().url());
            return url.searchParams.get('impersonate_member_uuid');
        }).toBe('12345');
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

        const {frame} = await initializeTest(page, {isAdmin: false});
        const comments = await frame.getByTestId('comment-component');
        await expect(comments).toHaveCount(1);
    });

    test('hidden comments are displayed for admins', async ({page}) => {
        mockedApi.addComment({html: '<p>This is comment 1</p>'});
        mockedApi.addComment({html: '<p>This is comment 2</p>', status: 'hidden'});

        const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');
        const {frame} = await initializeTest(page);
        // Wait for admin browse with member UUID (fully settled)
        await expect.poll(() => {
            if (!adminBrowseSpy.called) {
                return null;
            }
            const url = new URL(adminBrowseSpy.lastCall.args[0].request().url());
            return url.searchParams.get('impersonate_member_uuid');
        }).toBe('12345');
        const comments = await frame.getByTestId('comment-component');
        await expect(comments).toHaveCount(2);
        await expect(comments.nth(1)).toContainText('Hidden for members');
    });

    test('can hide and show comments', async ({page}) => {
        [1,2].forEach(i => mockedApi.addComment({html: `<p>This is comment ${i}</p>`}));

        const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');
        const {frame} = await initializeTest(page);
        // Wait for admin browse with member UUID (fully settled)
        await expect.poll(() => {
            if (!adminBrowseSpy.called) {
                return null;
            }
            const url = new URL(adminBrowseSpy.lastCall.args[0].request().url());
            return url.searchParams.get('impersonate_member_uuid');
        }).toBe('12345');
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

        const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');
        const {frame} = await initializeTest(page);
        // Wait for admin browse with member UUID (fully settled)
        await expect.poll(() => {
            if (!adminBrowseSpy.called) {
                return null;
            }
            const url = new URL(adminBrowseSpy.lastCall.args[0].request().url());
            return url.searchParams.get('impersonate_member_uuid');
        }).toBe('12345');
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

        const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');
        const {frame} = await initializeTest(page);
        // Wait for admin browse with member UUID (fully settled)
        await expect.poll(() => {
            if (!adminBrowseSpy.called) {
                return null;
            }
            const url = new URL(adminBrowseSpy.lastCall.args[0].request().url());
            return url.searchParams.get('impersonate_member_uuid');
        }).toBe('12345');
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

    test.describe('View in admin link', () => {
        test('shows View in admin link when commentModeration flag is enabled', async ({page}) => {
            mockedApi.addComment({id: 'test-comment-id', html: '<p>This is a comment</p>'});

            await mockAdminAuthFrame({page, admin});

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                title: 'Member discussion',
                count: true,
                admin,
                labs: {
                    commentModeration: true
                }
            });

            // Wait for admin auth to resolve (more-button appears after admin browse)
            const moreButtons = frame.getByTestId('more-button');
            await expect(moreButtons.nth(0)).toBeVisible();
            await moreButtons.nth(0).click();

            const viewInAdminLink = frame.getByTestId('view-in-admin-button');
            await expect(viewInAdminLink).toBeVisible();
            await expect(viewInAdminLink).toHaveAttribute('href', `${admin}#/comments/?id=is:test-comment-id`);
            await expect(viewInAdminLink).toHaveAttribute('target', '_blank');
        });

        test('hides View in admin link when commentModeration flag is not set', async ({page}) => {
            mockedApi.addComment({html: '<p>This is a comment</p>'});

            await mockAdminAuthFrame({page, admin});

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                title: 'Member discussion',
                count: true,
                admin,
                labs: {}
            });

            // Wait for admin auth to resolve (more-button appears after admin browse)
            const moreButtons = frame.getByTestId('more-button');
            await expect(moreButtons.nth(0)).toBeVisible();
            await moreButtons.nth(0).click();

            await expect(frame.getByTestId('view-in-admin-button')).not.toBeVisible();
        });
    });
});
