import {MockedApi, initialize} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Deleted and Hidden Content', async () => {
    // This is actually handled by the API since it should no longer return hidden
    // or deleted comments for non-admins, but we still test the behaviour here.
    test('hides hidden and deleted comments for non admins', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 2</p>',
            status: 'hidden'
        });
        mockedApi.addComment({
            html: '<p>This is comment 3</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 4</p>',
            status: 'deleted'
        });
        mockedApi.addComment({
            html: '<p>This is comment 5</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {
                commentImprovements: true
            }
        });

        const iframeElement = await page.locator('iframe[data-frame="admin-auth"]');
        await expect(iframeElement).toHaveCount(1);

        // Check if more actions button is visible on each comment
        const comments = await frame.getByTestId('comment-component');
        // 3 comments are visible
        await expect(comments).toHaveCount(3);
    });

    test('hidden and deleted comment shows with removed text when it has replies', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 2</p>',
            status: 'hidden',
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

        mockedApi.addComment({
            html: '<p>This is comment 3</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 4</p>',
            status: 'deleted',
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
        mockedApi.addComment({
            html: '<p>This is comment 5</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {
                commentImprovements: true
            }
        });

        await expect (frame.getByText('This is comment 2')).not.toBeVisible();
        await expect (frame.getByText('This comment has been hidden')).toBeVisible();

        await expect (frame.getByText('This is comment 4')).not.toBeVisible();
        await expect (frame.getByText('This comment has been removed')).toBeVisible();
    });

    test('hides replies that are hidden or deleted', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComment({
            html: '<p>This is comment 2</p>',
            status: 'hidden',
            replies: [
                mockedApi.buildReply({
                    html: '<p>This is reply 1</p>'
                }),
                mockedApi.buildReply({
                    html: '<p>This is reply 2</p>',
                    status: 'deleted'
                }),
                mockedApi.buildReply({
                    html: '<p>This is reply 3</p>',
                    status: 'hidden'
                })
            ]
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {
                commentImprovements: true
            }
        });

        await expect (frame.getByText('This is reply 1')).toBeVisible();
        await expect (frame.getByText('This is reply 2')).not.toBeVisible();
        // parent comment is hidden but shows text
        await expect (frame.getByText('This comment has been hidden')).toBeVisible();
    });
});

