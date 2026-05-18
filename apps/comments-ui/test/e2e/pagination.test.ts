import {MockedApi, addMultipleComments, initialize} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Pagination', async () => {
    test('Shows pagination button at top if more than 20 comments', async ({page}) => {
        const mockedApi = new MockedApi({});

        addMultipleComments(mockedApi, 21);

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        await expect(frame.getByTestId('pagination-component')).toBeVisible();

        // Check text in pagination button
        await expect(frame.getByTestId('pagination-component')).toContainText('Load more (1)');

        // Test total comments with test-id comment-component is 5
        await expect(frame.getByTestId('comment-component')).toHaveCount(20);

        // Check only the first latest 20 comments are visible
        await expect(frame.getByText('This is comment 1.')).toBeVisible();
        await expect(frame.getByText('This is comment 2.')).toBeVisible();
        await expect(frame.getByText('This is comment 3.')).toBeVisible();
        await expect(frame.getByText('This is comment 4.')).toBeVisible();
        await expect(frame.getByText('This is comment 5.')).toBeVisible();
        await expect(frame.getByText('This is comment 6.')).toBeVisible();
        await expect(frame.getByText('This is comment 20.')).toBeVisible();
        await expect(frame.getByText('This is comment 21.')).not.toBeVisible();

        //

        // Click the pagination button
        await frame.getByTestId('pagination-component').click();

        // Check only 21 visible (not more than that)
        await expect(frame.getByTestId('comment-component')).toHaveCount(21);

        // Check comments 6 is visible
        await expect(frame.getByText('This is comment 21.')).toBeVisible();

        // Check the pagination button is not visible
        await expect(frame.getByTestId('pagination-component')).not.toBeVisible();
    });

    test('shows all replies when API returns exactly 3', async ({page}) => {
        const mockedApi = new MockedApi({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>',
            replies: [
                mockedApi.buildReply({html: '<p>This is reply 1</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 2</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 3</p>'})
            ]
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        // All 3 replies visible, no pagination needed
        await expect(frame.getByTestId('comment-component')).toHaveCount(4);
        await expect(frame.getByText('This is reply 1')).toBeVisible();
        await expect(frame.getByText('This is reply 2')).toBeVisible();
        await expect(frame.getByText('This is reply 3')).toBeVisible();
        await expect(frame.getByTestId('reply-pagination-button')).not.toBeVisible();
    });

    test('collapses replies beyond 3 and expands client-side on click', async ({page}) => {
        const mockedApi = new MockedApi({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>',
            replies: [
                mockedApi.buildReply({html: '<p>This is reply 1</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 2</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 3</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 4</p>'})
            ]
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        await expect(frame.getByTestId('reply-pagination-button')).toBeVisible();
        await expect(frame.getByTestId('reply-pagination-button')).toContainText('Show 1 more reply');

        // Only first 3 replies visible (plus the parent)
        await expect(frame.getByTestId('comment-component')).toHaveCount(4);
        await expect(frame.getByText('This is reply 1')).toBeVisible();
        await expect(frame.getByText('This is reply 2')).toBeVisible();
        await expect(frame.getByText('This is reply 3')).toBeVisible();
        await expect(frame.getByText('This is reply 4')).not.toBeVisible();

        await frame.getByTestId('reply-pagination-button').click();

        await expect(frame.getByTestId('reply-pagination-button')).not.toBeVisible();
        await expect(frame.getByTestId('comment-component')).toHaveCount(5);
        await expect(frame.getByText('This is reply 4')).toBeVisible();
    });

    test('fetches remaining replies from server when API returns partial results', async ({page}) => {
        const mockedApi = new MockedApi({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>',
            replies: [
                mockedApi.buildReply({html: '<p>This is reply 1</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 2</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 3</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 4</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 5</p>'})
            ],
            count: {replies: 5, likes: 0}
        });

        // Override browse to only return first 3 replies (simulating LIMIT 3)
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

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        // Shows "Show 2 more replies" (5 total - 3 visible)
        await expect(frame.getByTestId('reply-pagination-button')).toBeVisible();
        await expect(frame.getByTestId('reply-pagination-button')).toContainText('Show 2 more replies');

        await expect(frame.getByTestId('comment-component')).toHaveCount(4);
        await expect(frame.getByText('This is reply 3')).toBeVisible();
        await expect(frame.getByText('This is reply 4')).not.toBeVisible();

        // Click fetches remaining replies from the server
        await frame.getByTestId('reply-pagination-button').click();

        await expect(frame.getByTestId('reply-pagination-button')).not.toBeVisible();
        await expect(frame.getByTestId('comment-component')).toHaveCount(6);
        await expect(frame.getByText('This is reply 4')).toBeVisible();
        await expect(frame.getByText('This is reply 5')).toBeVisible();
    });

    test('paginates through multiple server pages to fetch all replies', async ({page}) => {
        const mockedApi = new MockedApi({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>',
            replies: [
                mockedApi.buildReply({html: '<p>This is reply 1</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 2</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 3</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 4</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 5</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 6</p>'}),
                mockedApi.buildReply({html: '<p>This is reply 7</p>'})
            ],
            count: {replies: 7, likes: 0}
        });

        // Override browse to return only 3 replies inline (simulating server LIMIT)
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

        // Override replies endpoint to return 2 per page, forcing multiple fetches
        const originalBrowseReplies = mockedApi.browseReplies.bind(mockedApi);
        mockedApi.browseReplies = function (options) {
            return originalBrowseReplies({...options, limit: 2});
        };

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        // 3 replies shown initially, button reflects total hidden (7 - 3 = 4)
        await expect(frame.getByTestId('reply-pagination-button')).toBeVisible();
        await expect(frame.getByTestId('reply-pagination-button')).toContainText('Show 4 more replies');

        await expect(frame.getByTestId('comment-component')).toHaveCount(4);
        await expect(frame.getByText('This is reply 3')).toBeVisible();
        await expect(frame.getByText('This is reply 4')).not.toBeVisible();

        // Click triggers multiple server fetches (2 per page) until all are loaded
        await frame.getByTestId('reply-pagination-button').click();

        await expect(frame.getByTestId('reply-pagination-button')).not.toBeVisible();
        await expect(frame.getByTestId('comment-component')).toHaveCount(8);
        await expect(frame.getByText('This is reply 4')).toBeVisible();
        await expect(frame.getByText('This is reply 7')).toBeVisible();
    });

    test('Can handle comments with deleted member', async ({page}) => {
        const mockedApi = new MockedApi({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>',
            member: null
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        await expect(frame.getByTestId('comment-component')).toHaveCount(1);

        await expect(frame.getByText('This is comment 1')).toBeVisible();
    });
});

