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
        await expect(frame.getByTestId('pagination-component')).toContainText('Show 1 previous comment');

        // Test total comments with test-id comment-component is 5
        await expect(frame.getByTestId('comment-component')).toHaveCount(20);

        // Check only the first latest 20 comments are visible
        await expect(frame.getByText('This is comment 1.')).not.toBeVisible();
        await expect(frame.getByText('This is comment 2.')).toBeVisible();
        await expect(frame.getByText('This is comment 3.')).toBeVisible();
        await expect(frame.getByText('This is comment 4.')).toBeVisible();
        await expect(frame.getByText('This is comment 5.')).toBeVisible();
        await expect(frame.getByText('This is comment 6.')).toBeVisible();
        await expect(frame.getByText('This is comment 20.')).toBeVisible();

        // 

        // Click the pagination button
        await frame.getByTestId('pagination-component').click();

        // Check only 21 visible (not more than that)
        await expect(frame.getByTestId('comment-component')).toHaveCount(21);

        // Check comments 6 is visible
        await expect(frame.getByText('This is comment 1.')).toBeVisible();

        // Check the pagination button is not visible
        await expect(frame.getByTestId('pagination-component')).not.toBeVisible();
    });

    test('Shows pagination button for replies', async ({page}) => {
        const mockedApi = new MockedApi({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>',
            replies: [
                mockedApi.buildReply({
                    html: '<p>This is reply 1</p>'
                }),
                mockedApi.buildReply({
                    html: '<p>This is reply 2</p>'
                }),
                mockedApi.buildReply({
                    html: '<p>This is reply 3</p>'
                }),
                mockedApi.buildReply({
                    html: '<p>This is reply 4</p>'
                })
            ]
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        await expect(frame.getByTestId('reply-pagination-button')).toBeVisible();

        // Check text in pagination button
        await expect(frame.getByTestId('reply-pagination-button')).toContainText('Show 1 more reply');

        await expect(frame.getByTestId('comment-component')).toHaveCount(4);

        // Check only the first 5 comments are visible
        await expect(frame.getByText('This is comment 1')).toBeVisible();
        await expect(frame.getByText('This is reply 1')).toBeVisible();
        await expect(frame.getByText('This is reply 2')).toBeVisible();
        await expect(frame.getByText('This is reply 3')).toBeVisible();
        await expect(frame.getByText('This is reply 4')).not.toBeVisible();

        // Click the pagination button
        await frame.getByTestId('reply-pagination-button').click();

        // No longer visible
        await expect(frame.getByTestId('reply-pagination-button')).not.toBeVisible();

        await expect(frame.getByTestId('comment-component')).toHaveCount(5);
        await expect(frame.getByText('This is comment 1')).toBeVisible();
        await expect(frame.getByText('This is reply 1')).toBeVisible();
        await expect(frame.getByText('This is reply 2')).toBeVisible();
        await expect(frame.getByText('This is reply 3')).toBeVisible();
        await expect(frame.getByText('This is reply 4')).toBeVisible();
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

