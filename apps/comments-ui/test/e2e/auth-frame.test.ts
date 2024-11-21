import {MOCKED_SITE_URL, MockedApi, initialize, mockAdminAuthFrame, mockAdminAuthFrame204} from '../utils/e2e';
import {expect, test} from '@playwright/test';

const admin = MOCKED_SITE_URL + '/ghost/';

test.describe('Auth Frame', async () => {
    test('skips rendering the auth frame with no comments', async ({page}) => {
        const mockedApi = new MockedApi({});
        await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            admin
        });

        const iframeElement = await page.locator('iframe[data-frame="admin-auth"]');
        await expect(iframeElement).toHaveCount(0);
    });

    test('renders the auth frame when there are comments', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });

        await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            admin
        });

        const iframeElement = await page.locator('iframe[data-frame="admin-auth"]');
        await expect(iframeElement).toHaveCount(1);
    });

    test('has no admin options when not signed in to Ghost admin', async ({page}) => {
        await mockAdminAuthFrame204({page, admin});

        const mockedApi = new MockedApi({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 2</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 3</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 4</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 5</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            admin
        });

        const iframeElement = await page.locator('iframe[data-frame="admin-auth"]');
        await expect(iframeElement).toHaveCount(1);

        const comments = await frame.getByTestId('comment-component');
        await expect(comments).toHaveCount(5);

        const moreButtons = await frame.getByTestId('more-button');
        await expect(moreButtons).toHaveCount(0);
    });

    test('has admin options when signed in to Ghost admin', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 2</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 3</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 4</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 5</p>'
        });

        await mockAdminAuthFrame({
            admin,
            page
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            admin
        });

        const iframeElement = await page.locator('iframe[data-frame="admin-auth"]');
        await expect(iframeElement).toHaveCount(1);

        // Check if more actions button is visible on each comment
        const comments = await frame.getByTestId('comment-component');
        await expect(comments).toHaveCount(5);

        const moreButtons = await frame.getByTestId('more-button');
        await expect(moreButtons).toHaveCount(5);

        // Click the 2nd button
        await moreButtons.nth(1).click();
        await moreButtons.nth(1).getByText('Hide comment').click();

        // Check comment2 is replaced with a hidden message
        const secondComment = comments.nth(1);
        await expect(secondComment).toContainText('This comment has been hidden.');
        await expect(secondComment).not.toContainText('This is comment 2');

        // Check can show it again
        await moreButtons.nth(1).click();
        await moreButtons.nth(1).getByText('Show comment').click();
        await expect(secondComment).toContainText('This is comment 2');
    });

    test('has admin options when signed in to Ghost admin and as a member', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 2</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 3</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 4</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 5</p>'
        });

        await mockAdminAuthFrame({
            admin,
            page
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            admin
        });

        const iframeElement = await page.locator('iframe[data-frame="admin-auth"]');
        await expect(iframeElement).toHaveCount(1);

        // Check if more actions button is visible on each comment
        const comments = await frame.getByTestId('comment-component');
        await expect(comments).toHaveCount(5);

        const moreButtons = await frame.getByTestId('more-button');
        await expect(moreButtons).toHaveCount(5);

        // Click the 2nd button
        await moreButtons.nth(1).click();
        await moreButtons.nth(1).getByText('Hide comment').click();

        // Check comment2 is replaced with a hidden message
        const secondComment = comments.nth(1);
        await expect(secondComment).toContainText('This comment has been hidden.');
        await expect(secondComment).not.toContainText('This is comment 2');

        // Check can show it again
        await moreButtons.nth(1).click();
        await moreButtons.nth(1).getByText('Show comment').click();
        await expect(secondComment).toContainText('This is comment 2');
    });

    test('Hidden comment is displayed for admins - needs flags enabled', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 2</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 3</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 4</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 5</p>'
        });

        await mockAdminAuthFrame({
            admin,
            page
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            admin,
            labs: {
                commentImprovements: true
            }
        });

        const iframeElement = await page.locator('iframe[data-frame="admin-auth"]');
        await expect(iframeElement).toHaveCount(1);

        // Check if more actions button is visible on each comment
        const comments = await frame.getByTestId('comment-component');
        await expect(comments).toHaveCount(5);

        const moreButtons = await frame.getByTestId('more-button');
        await expect(moreButtons).toHaveCount(5);

        // Click the 2nd button
        await moreButtons.nth(1).click();
        await moreButtons.nth(1).getByText('Hide comment').click();

        const secondComment = comments.nth(1);
        // expect "hidden for members" message
        await expect(secondComment).toContainText('Hidden for members');

        // Check can show it again
        await moreButtons.nth(1).click();
        await moreButtons.nth(1).getByText('Show comment').click();
        await expect(secondComment).toContainText('This is comment 2');
    });
});

