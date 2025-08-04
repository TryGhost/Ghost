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
                    path: '/v1/posts/me',
                    response: myPosts
                },
                getMyAccount: {
                    method: 'GET',
                    path: '/v1/account/me',
                    response: {
                        id: 'alice',
                        handle: '@alice@fake.host',
                        name: 'Alice',
                        url: 'https://fake.host/@alice',
                        avatarUrl: 'https://fake.host/avatars/alice.jpg',
                        followingCount: 5,
                        followerCount: 10,
                        likedCount: 3
                    }
                }
            }, options: {useActivityPub: true}});

            await page.goto('#/profile');

            // Wait for the profile posts list to be visible
            const profileList = page.getByTestId('profile-posts-list');
            await expect(profileList).toBeVisible();

            // Check that the posts are rendered
            const profileItems = page.getByTestId('profile-post-item');
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
                    path: '/v1/posts/me',
                    response: myPosts
                },
                getMyAccount: {
                    method: 'GET',
                    path: '/v1/account/me',
                    response: {
                        id: 'alice',
                        handle: '@alice@fake.host',
                        name: 'Alice',
                        url: 'https://fake.host/@alice',
                        avatarUrl: 'https://fake.host/avatars/alice.jpg',
                        followingCount: 5,
                        followerCount: 10,
                        likedCount: 3
                    }
                },
                deletePost: {
                    method: 'DELETE',
                    path: `/v1/post/${postToDeleteId}`,
                    response: {}
                }
            }, options: {useActivityPub: true}});

            await page.goto('#/profile');

            // Wait for the profile posts list to be visible
            const profileList = page.getByTestId('profile-posts-list');
            await expect(profileList).toBeVisible();

            // Get the first post (authored by me)
            const profileItems = page.getByTestId('profile-post-item');
            const firstItem = profileItems.first();

            // Open the menu and delete the post
            await firstItem.hover();
            const menuButton = firstItem.getByTestId('menu-button');
            await expect(menuButton).toBeVisible();
            await menuButton.click();
            const deleteButton = page.getByRole('button', {name: 'Delete'});
            await expect(deleteButton).toBeVisible();
            await deleteButton.click();

            // Confirm deletion
            const confirmDeleteButton = page.getByRole('button', {name: 'Delete'}).last();
            await expect(confirmDeleteButton).toBeVisible();
            await confirmDeleteButton.click();

            // Check that the post was deleted
            await expect.poll(() => lastApiRequests.deletePost).toBeTruthy();

            // Now check that I cannot delete a post that I didn't authored
            const otherUserPost = profileItems.nth(7);
            await otherUserPost.hover();

            // Open the menu for a reposted post
            const otherPostMenuButton = otherUserPost.getByTestId('menu-button');
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
                    path: '/v1/posts/me',
                    response: myPosts
                },
                getMyAccount: {
                    method: 'GET',
                    path: '/v1/account/me',
                    response: {
                        id: 'alice',
                        handle: '@alice@fake.host',
                        name: 'Alice',
                        url: 'https://fake.host/@alice',
                        avatarUrl: 'https://fake.host/avatars/alice.jpg',
                        followingCount: 5,
                        followerCount: 10,
                        likedCount: 3
                    }
                },
                getMyProfileLiked: {
                    method: 'GET',
                    path: '/v1/posts/me/liked',
                    response: myLikedPosts
                }
            }, options: {useActivityPub: true}});

            await page.goto('#/profile');

            // Click on the Likes tab
            const likesTab = page.getByRole('tab', {name: 'Likes'});
            await likesTab.click();

            // Wait for the liked posts list to be visible
            const likedList = page.getByTestId('profile-likes-list');
            await expect(likedList).toBeVisible();

            // Check that posts I liked posts are rendered
            const likedItems = page.getByTestId('profile-like-item');
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
                    path: '/v1/posts/me',
                    response: myPosts
                },
                getMyAccount: {
                    method: 'GET',
                    path: '/v1/account/me',
                    response: {
                        id: 'alice',
                        handle: '@alice@fake.host',
                        name: 'Alice',
                        url: 'https://fake.host/@alice',
                        avatarUrl: 'https://fake.host/avatars/alice.jpg',
                        followingCount: 5,
                        followerCount: 10,
                        likedCount: 3
                    }
                },
                getMyProfileFollowers: {
                    method: 'GET',
                    path: '/v1/account/me/follows/followers',
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

            // Wait for actor list to load
            const actorList = page.getByTestId('actor-list');
            await expect(actorList).toBeVisible();

            // Get actor items
            const actorItems = page.getByTestId('actor-item');
            await expect(actorItems).toHaveCount(myFollowers.accounts.length);

            // Find Bob's actor item
            const bobRow = actorItems.filter({
                hasText: bob.name
            }).filter({
                hasText: bob.handle
            }).first();

            await expect(bobRow).toBeVisible();

            // Check that Bob has a "Following" button since I'm following Bob
            const followingBob = bobRow.getByTestId('follow-button').filter({hasText: /Following/i}).first();
            await expect(followingBob).toBeVisible();

            // Click the "Following" button to unfollow Bob
            await followingBob.click();

            // Bob should now have a "Follow" button since I'm not following him anymore
            const notFollowingBob = bobRow.getByTestId('follow-button').filter({hasText: /Follow/i}).first();
            await expect(notFollowingBob).toBeVisible();
        });
    });

    test.describe('Following', () => {
        test('I can see people that I follow on my profile', async ({page}) => {
            const bob = myFollowing.accounts[0];

            await mockApi({page, requests: {
                getMyProfile: {
                    method: 'GET',
                    path: '/v1/posts/me',
                    response: myPosts
                },
                getMyAccount: {
                    method: 'GET',
                    path: '/v1/account/me',
                    response: {
                        id: 'alice',
                        handle: '@alice@fake.host',
                        name: 'Alice',
                        url: 'https://fake.host/@alice',
                        avatarUrl: 'https://fake.host/avatars/alice.jpg',
                        followingCount: 5,
                        followerCount: 10,
                        likedCount: 3
                    }
                },
                getMyProfileFollowing: {
                    method: 'GET',
                    path: '/v1/account/me/follows/following',
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

            // Wait for actor list to load
            const actorList = page.getByTestId('actor-list');
            await expect(actorList).toBeVisible();

            // Get actor items
            const actorItems = page.getByTestId('actor-item');
            await expect(actorItems).toHaveCount(myFollowing.accounts.length);

            // Find Bob's actor item
            const bobRow = actorItems.filter({
                hasText: bob.name
            }).filter({
                hasText: bob.handle
            }).first();

            await expect(bobRow).toBeVisible();

            // Check that Bob has a "Following" button since I'm following Bob
            const followingBob = bobRow.getByTestId('follow-button').filter({hasText: /Following/i}).first();
            await expect(followingBob).toBeVisible();

            // Click the "Following" button to unfollow Bob
            await followingBob.click();

            // Bob should now have a "Follow" button since I'm not following him anymore
            const notFollowingBob = bobRow.getByTestId('follow-button').filter({hasText: /Follow/i}).first();
            await expect(notFollowingBob).toBeVisible();
        });
    });
});
