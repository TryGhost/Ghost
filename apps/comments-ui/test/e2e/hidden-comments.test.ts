import {MOCKED_SITE_URL, MockedApi, initialize, mockAdminAuthFrame, waitEditorFocuse} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Hidden Comments', async () => {
    test.describe('as an admin', async () => {
        const admin = MOCKED_SITE_URL + '/ghost/';
        test('admin can see hidden comments', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment({
                html: '<p>This is comment 1</p>'
            });
            mockedApi.addComment({
                html: '<p>This is a naughty comment and should be hidden</p>'
            });
            mockedApi.addComment({
                html: '<p>This is comment 3</p>'
            });
            mockedApi.setMember({});
    
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
    
            const comments = await frame.getByTestId('comment-component');
    
            await expect(comments).toHaveCount(3);
    
            // click on the 2nd comment's more button
    
            const moreButtons = await frame.getByTestId('more-button');
    
            await moreButtons.nth(1).click();
    
            // hide the comment
    
            await moreButtons.nth(1).getByText('Hide comment').click();
    
            // check if the comment is hidden
    
            const secondComment = comments.nth(1);
    
            await expect(secondComment).toContainText('This is a naughty comment and should be hidden');
            await expect(secondComment).toContainText('Hidden - not visible to members');
        });
    });

    test.describe('as a member', async () => {
        test('Members cannot see hidden nor deleted comments', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.setMember({
                name: 'Ghost Foundation',
                expertise: 'Publishing'
            });
            mockedApi.addComment({
                html: '<p>This is comment 1</p>',
                status: 'published'
            });
            mockedApi.addComment({
                html: '<p>This is a naughty comment and should be hidden</p>',
                status: 'hidden'
            });
            mockedApi.addComment({
                html: '<p>This is comment 3</p>',
                status: 'deleted'
            });
    
            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                labs: {
                    commentImprovements: true
                }
            });
      
            const comments = await frame.getByTestId('comment-component');
            await expect(comments).toHaveCount(1);
        });
        test('Members cannot see hidden comments', async ({page}) => {
            const mockedApi = new MockedApi({});
            const naughtyMember = mockedApi.createMember({
                name: 'Rambo',
                expertise: null
            });
            mockedApi.setMember({name: 'Spud', expertise: null});
            mockedApi.addComment({
                html: '<p>This is comment 1</p>'
            });
            mockedApi.addComment({
                html: '<p>This is a naughty comment and should be hidden</p>',
                status: 'hidden',
                member: naughtyMember
            });
            mockedApi.addComment({
                html: '<p>This is comment 3</p>'
            });
    
            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                labs: {
                    commentImprovements: true
                }
            });
    
            // Logged in member should not be able to see the hidden comment
    
            const comments = await frame.locator('data-testid=comment-component');
    
            const secondComment = comments.nth(1);
    
            await expect(secondComment).not.toContainText(
                'This is a naughty comment and should be hidden'
            );
        });

        test('Members cannot see hidden parent, but reply will still show', async ({page}) => {
            const mockedApi = new MockedApi({});
            const naughtyMember = mockedApi.createMember({
                name: 'Rambo',
                expertise: null
            });
            mockedApi.setMember({name: 'Spud', expertise: null});
            mockedApi.addComment({
                html: '<p>This is comment 1</p>'
            });
            mockedApi.addComment({
                html: '<p>This is a naughty comment and should be hidden</p>',
                status: 'hidden',
                replies: [
                    mockedApi.buildReply({
                        html: '<p>you said something really bad</p>',
                        status: 'published'
                    })
                ],
                member: naughtyMember
            });

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                labs: {
                    commentImprovements: true
                }
            });

            const comments = await frame.locator('data-testid=comment-component');

            const secondComment = comments.nth(1);
            await expect(secondComment).not.toContainText('This is a naughty comment and should be hidden');
            await expect(secondComment).toContainText('you said something really bad');
        });
    });

    test.describe('as a guest (non-member)', async () => {
        test('Guest visitors cannot see hidden nor deleted comments', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment({
                html: '<p>This is comment 1</p>',
                status: 'published'
            });
            mockedApi.addComment({
                html: '<p>This is a naughty comment and should be hidden</p>',
                status: 'hidden'
            });
            mockedApi.addComment({
                html: '<p>This is comment 3</p>',
                status: 'deleted'
            });
    
            mockedApi.logoutMember();
    
            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                labs: {
                    commentImprovements: true
                }
            });
        
            const comments = await frame.getByTestId('comment-component');
                
            await expect(comments).toHaveCount(1);
        });
    
        test('Guest visitors cannot see hidden parent, but reply will still show', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment({
                html: '<p>This is comment 1</p>',
                status: 'published'
            });
            mockedApi.addComment({
                html: '<p>This is a naughty comment and should be hidden</p>',
                status: 'hidden',
                replies: [
                    mockedApi.buildReply({
                        html: '<p>you said something really bad</p>',
                        status: 'published'
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
    
            const comments = await frame.locator('data-testid=comment-component');
    
            const secondComment = comments.nth(1);
            await expect(secondComment).not.toContainText('This is a naughty comment and should be hidden');
            await expect(secondComment).toContainText('you said something really bad');
        });
    });
});
