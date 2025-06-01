import likedPosts from '../utils/responses/activitypub/my-profile-liked.json';
import posts from '../utils/responses/activitypub/my-profile-posts.json';
import {expect, test} from '@playwright/test';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';
import {mockInitialApiRequests} from '../utils/initial-api-requests';

test.describe('My Profile', async () => {
    test.beforeEach(async ({page}) => {
        await mockInitialApiRequests(page);
    });

    test.describe('Posts', () => {
        test('I can view posts I created or reposted on my profile', async ({page}) => {
            await mockApi({page, requests: {
                getMyProfile: {
                    method: 'GET',
                    path: '/posts/me',
                    response: posts
                }
            }, options: {useActivityPub: true}});

            await page.goto('#/profile');

            // Wait for the profile posts list to be visible
            const profileList = page.getByRole('list');
            await expect(profileList).toBeVisible();

            // Check that the posts are rendered
            const profileItems = page.getByRole('listitem');
            await expect(profileItems).toHaveCount(9);

            // Check that My Profile shows posts I authored
            const myPost = posts.posts[0];
            const firstItem = profileItems.first();
            const firstItemText = await firstItem.textContent();

            expect(firstItemText).toContain(myPost.author.name);
            expect(firstItemText).toContain(myPost.title);
            expect(firstItemText).toContain(myPost.excerpt);

            // Check that My Profile shows posts I reposted
            const repostedPost = posts.posts[2];
            const thirdItem = profileItems.nth(2);
            const thirdItemText = await thirdItem.textContent();

            expect(thirdItemText).toContain(`${repostedPost.repostedBy?.name}reposted`);
            expect(thirdItemText).toContain(repostedPost.title);
        });

        test('I can delete a post I created from my profile', async ({page}) => {
            const firstPost = posts.posts[0]; // Post authored by me
            const postToDeleteId = encodeURIComponent(firstPost.id);

            const {lastApiRequests} = await mockApi({page, requests: {
                getMyProfile: {
                    method: 'GET',
                    path: '/posts/me',
                    response: posts
                },
                deletePost: {
                    method: 'DELETE',
                    path: `/post/${postToDeleteId}`,
                    response: {}
                }
            }, options: {useActivityPub: true}});

            await page.goto('#/profile');

            // Wait for the profile posts list to be visible
            const profileList = page.getByRole('list');
            await expect(profileList).toBeVisible();

            // Get the first post (authored by me)
            const profileItems = page.getByRole('listitem');
            const firstItem = profileItems.first();

            // Click on the Delete button
            await firstItem.hover();
            const actionButtons = firstItem.getByRole('button');
            const menuButton = actionButtons.nth(0);
            await expect(menuButton).toBeVisible();
            await menuButton.click();
            const deleteButton = page.getByRole('button', {name: 'Delete'});
            await expect(deleteButton).toBeVisible();
            await deleteButton.click();

            // Confirm deletion
            const confirmDeleteButton = page.getByRole('button', {name: 'Delete'}).last();
            await expect(confirmDeleteButton).toBeVisible();
            await confirmDeleteButton.click();

            // Wait for the request to be made
            await page.waitForTimeout(100);

            // Verify that a DELETE request was made
            expect(lastApiRequests.deletePost).toBeTruthy();

            // Now check that I can delete a post that I didn't authored (e.g. reposted by me)
            const otherUserPost = profileItems.nth(7);
            await otherUserPost.hover();

            // Click the menu button on the reposted post
            const otherPostActionButtons = otherUserPost.getByRole('button');
            const otherPostMenuButton = otherPostActionButtons.nth(0);
            await expect(otherPostMenuButton).toBeVisible();
            await otherPostMenuButton.click();

            // Wait for the popover to appear
            await page.waitForTimeout(100);

            // Verify the delete option is not present
            const deleteButtons = page.getByRole('button', {name: 'Delete'});
            await expect(deleteButtons).toHaveCount(0);
        });
    });

    test.describe('Likes', () => {
        test('I can view posts I liked on my profile', async ({page}) => {
            await mockApi({page, requests: {
                getMyProfile: {
                    method: 'GET',
                    path: '/posts/me',
                    response: posts
                },
                getMyProfileLiked: {
                    method: 'GET',
                    path: '/posts/me/liked',
                    response: likedPosts
                }
            }, options: {useActivityPub: true}});

            await page.goto('#/profile');

            // Click on the Likes tab
            const likesTab = page.getByRole('tab', {name: 'Likes'});
            await likesTab.click();

            // Wait for the liked posts list to be visible
            const likedList = page.getByRole('list');
            await expect(likedList).toBeVisible();

            // Check that posts I liked posts are rendered
            const likedItems = page.getByRole('listitem');
            await expect(likedItems).toHaveCount(4);

            const firstLikedPost = likedPosts.posts[0];
            const firstItem = likedItems.first();
            const firstItemText = await firstItem.textContent();

            expect(firstItemText).toContain(firstLikedPost.author.name);
            expect(firstItemText).toContain(firstLikedPost.content.replace(/<[^>]*>/g, '').substring(0, 50));

            // Check that reposted posts that I liked are also rendered
            const repostedPost = likedPosts.posts[1];
            const secondItem = likedItems.nth(1);
            const secondItemText = await secondItem.textContent();

            expect(secondItemText).toContain(repostedPost.author.name);
            expect(secondItemText).toContain(`${repostedPost.repostedBy?.name}reposted`);
        });
    });
});
