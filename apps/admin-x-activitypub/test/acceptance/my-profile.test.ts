import myFollowers from '../utils/responses/activitypub/my-profile-followers.json';
import myFollowing from '../utils/responses/activitypub/my-profile-following.json';
import myLikedPosts from '../utils/responses/activitypub/my-profile-liked.json';
import myPosts from '../utils/responses/activitypub/my-profile-posts.json';
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
                    response: myPosts
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
            const myPost = myPosts.posts[0];
            const firstItem = profileItems.first();
            const firstItemText = await firstItem.textContent();

            expect(firstItemText).toContain(myPost.author.name);
            expect(firstItemText).toContain(myPost.title);
            expect(firstItemText).toContain(myPost.excerpt);

            // Check that My Profile shows posts I reposted
            const repostedPost = myPosts.posts[2];
            const thirdItem = profileItems.nth(2);
            const thirdItemText = await thirdItem.textContent();

            expect(thirdItemText).toContain(`${repostedPost.repostedBy?.name}reposted`);
            expect(thirdItemText).toContain(repostedPost.title);
        });

        test('I can delete a post I created from my profile', async ({page}) => {
            const firstPost = myPosts.posts[0]; // Post authored by me
            const postToDeleteId = encodeURIComponent(firstPost.id);

            const {lastApiRequests} = await mockApi({page, requests: {
                getMyProfile: {
                    method: 'GET',
                    path: '/posts/me',
                    response: myPosts
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
                    response: myPosts
                },
                getMyProfileLiked: {
                    method: 'GET',
                    path: '/posts/me/liked',
                    response: myLikedPosts
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

            const firstLikedPost = myLikedPosts.posts[0];
            const firstItem = likedItems.first();
            const firstItemText = await firstItem.textContent();

            expect(firstItemText).toContain(firstLikedPost.author.name);
            expect(firstItemText).toContain(firstLikedPost.content.replace(/<[^>]*>/g, '').substring(0, 50));

            // Check that reposted posts that I liked are also rendered
            const repostedPost = myLikedPosts.posts[1];
            const secondItem = likedItems.nth(1);
            const secondItemText = await secondItem.textContent();

            expect(secondItemText).toContain(repostedPost.author.name);
            expect(secondItemText).toContain(`${repostedPost.repostedBy?.name}reposted`);
        });
    });

    test.describe('Followers', () => {
        test('I can see people that follow me on my profile', async ({page}) => {
            const bob = myFollowers.accounts[0];

            await mockApi({page, requests: {
                getMyProfile: {
                    method: 'GET',
                    path: '/posts/me',
                    response: myPosts
                },
                getMyProfileFollowers: {
                    method: 'GET',
                    path: '/account/me/follows/followers',
                    response: myFollowers
                }
            }, options: {useActivityPub: true}});

            await page.goto('#/profile');

            // Click on the Followers tab
            const followersTab = page.getByRole('tab', {name: 'Followers'});
            await followersTab.click();

            // Wait for the tab to be active
            await expect(followersTab).toHaveAttribute('aria-selected', 'true');

            // Wait for the followers list to be visible
            const followersContent = page.locator('[role="tabpanel"][data-state="active"]');
            await expect(followersContent).toBeVisible();

            const bobRow = followersContent.locator('div').filter({
                hasText: bob.name
            }).filter({
                hasText: bob.handle
            }).first();

            await expect(bobRow).toBeVisible();

            // Check that Bob has a "Following" button since I'm following Bob:
            const followingBob = bobRow.locator('button').filter({hasText: /Following/i}).first();
            await expect(followingBob).toBeVisible();

            // Clicking on the "Following" button should unfollow Bob
            await followingBob.click();

            // Bob should now have a "Follow" button since I'm not following him anymore:
            const notFollowingBob = bobRow.locator('button').filter({hasText: /Follow/i}).first();
            await expect(notFollowingBob).toBeVisible();
        });
    });

    test.describe('Following', () => {
        test('I can see people that I follow on my profile', async ({page}) => {
            const bob = myFollowing.accounts[0];

            await mockApi({page, requests: {
                getMyProfile: {
                    method: 'GET',
                    path: '/posts/me',
                    response: myPosts
                },
                getMyProfileFollowing: {
                    method: 'GET',
                    path: '/account/me/follows/following',
                    response: myFollowing
                }
            }, options: {useActivityPub: true}});

            await page.goto('#/profile');

            // Click on the Following tab
            const followingTab = page.getByRole('tab', {name: 'Following'});
            await followingTab.click();

            // Wait for the tab to be active
            await expect(followingTab).toHaveAttribute('aria-selected', 'true');

            // Wait for the following list to be visible
            const followingContent = page.locator('[role="tabpanel"][data-state="active"]');
            await expect(followingContent).toBeVisible();

            // Bob should be in my list of following:
            const bobRow = followingContent.locator('div').filter({
                hasText: bob.name
            }).filter({
                hasText: bob.handle
            }).first();

            await expect(bobRow).toBeVisible();

            // Check that Bob has a "Following" button since I'm following Bob:
            const followingBob = bobRow.locator('button').filter({hasText: /Following/i}).first();
            await expect(followingBob).toBeVisible();

            // Clicking on the "Following" button should unfollow Bob
            await followingBob.click();

            // Bob should now have a "Follow" button since I'm not following him anymore:
            const notFollowingBob = bobRow.locator('button').filter({hasText: /Follow/i}).first();
            await expect(notFollowingBob).toBeVisible();

            // Clicking on the "Follow" button should follow Bob again
            await notFollowingBob.click();

            // Bob should now have a "Following" button since I'm following him again:
            const followingBobAgain = bobRow.locator('button').filter({hasText: /Following/i}).first();
            await expect(followingBobAgain).toBeVisible();
        });
    });
});
