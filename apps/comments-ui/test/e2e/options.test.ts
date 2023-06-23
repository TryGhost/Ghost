import {MockedApi, initialize} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Options', async () => {
    test('Shows the title and count', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComments(2);

        const {frame} = await initialize({
            mockedApi,
            page,
            title: 'Leave a comment',
            publication: 'Publisher Weekly',
            count: true
        });

        // Check text 'Leave a comment' is present
        await expect(frame.getByTestId('title')).toHaveText('Leave a comment');
        await expect(frame.getByTestId('count')).toHaveText('2 comments');
    });

    test('Shows the title and singular count', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComments(1);

        const {frame} = await initialize({
            mockedApi,
            page,
            title: 'Leave a comment',
            publication: 'Publisher Weekly',
            count: true
        });

        // Check text 'Leave a comment' is present
        await expect(frame.getByTestId('title')).toHaveText('Leave a comment');
        await expect(frame.getByTestId('count')).toHaveText('1 comment');
    });

    test('Shows the title but hides the count', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComments(2);

        const {frame} = await initialize({
            mockedApi,
            page,
            title: 'Leave a comment',
            publication: 'Publisher Weekly',
            count: false
        });

        // Check text 'Leave a comment' is present
        await expect(frame.getByTestId('title')).toHaveText('Leave a comment');

        // Check count is hidden
        await expect(frame.getByTestId('count')).not.toBeVisible();
    });

    test('Hides title and count', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComments(2);

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        await expect(frame.getByTestId('title')).not.toBeVisible();
        await expect(frame.getByTestId('count')).not.toBeVisible();
    });
});

