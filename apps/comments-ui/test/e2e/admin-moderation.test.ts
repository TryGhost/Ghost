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
        options = {isAdmin: true, labs: false, member: {id: '1'}, ...options};

        if (options.isAdmin) {
            await mockAdminAuthFrame({page, admin});
        } else {
            await mockAdminAuthFrame204({page, admin});
        }

        mockedApi.setMember(options.member);

        if (options.labs) {
            mockedApi.setLabs({commentImprovements: true});
        }

        return await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            admin,
            labs: {
                commentImprovements: options.labs
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

    test('can hide and show comments', async ({page}) => {
        mockedApi.addComment({html: '<p>This is comment 1</p>'});
        mockedApi.addComment({html: '<p>This is comment 2</p>'});

        const {frame} = await initializeTest(page);

        // Click the hide button for 2nd comment
        const moreButtons = frame.getByTestId('more-button');
        await moreButtons.nth(1).click();
        await moreButtons.nth(1).getByTestId('hide-button').click();

        // comment becomes hidden
        const comments = frame.getByTestId('comment-component');
        const secondComment = comments.nth(1);
        await expect(secondComment).toContainText('This comment has been hidden.');
        await expect(secondComment).not.toContainText('This is comment 2');

        // can show it again
        await moreButtons.nth(1).click();
        await moreButtons.nth(1).getByTestId('show-button').click();
        await expect(secondComment).toContainText('This is comment 2');
    });

    test.describe('commentImprovements', function () {
        test('hidden comments are not displayed for non-admins', async ({page}) => {
            mockedApi.addComment({html: '<p>This is comment 1</p>'});
            mockedApi.addComment({html: '<p>This is comment 2</p>', status: 'hidden'});

            const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');

            const {frame} = await initializeTest(page, {isAdmin: false, labs: true});
            const comments = await frame.getByTestId('comment-component');
            await expect(comments).toHaveCount(1);

            expect(adminBrowseSpy.called).toBe(false);
        });

        test('hidden comments are displayed for admins', async ({page}) => {
            mockedApi.addComment({html: '<p>This is comment 1</p>'});
            mockedApi.addComment({html: '<p>This is comment 2</p>', status: 'hidden'});

            const adminBrowseSpy = sinon.spy(mockedApi.adminRequestHandlers, 'browseComments');

            const {frame} = await initializeTest(page, {labs: true});
            const comments = await frame.getByTestId('comment-component');
            await expect(comments).toHaveCount(2);
            await expect(comments.nth(1)).toContainText('Hidden for members');

            expect(adminBrowseSpy.called).toBe(true);
        });

        test('can hide and show comments', async ({page}) => {
            [1,2].forEach(i => mockedApi.addComment({html: `<p>This is comment ${i}</p>`}));

            const {frame} = await initializeTest(page, {labs: true});
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

            const {frame} = await initializeTest(page, {labs: true});
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

            const {frame} = await initializeTest(page, {labs: true});
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
    });
});
