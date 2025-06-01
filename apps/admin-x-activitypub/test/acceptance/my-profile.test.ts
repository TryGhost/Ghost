import myProfilePosts from '../utils/responses/activitypub/my-profile-posts.json';
import {expect, test} from '@playwright/test';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';
import {mockInitialApiRequests} from '../utils/initial-api-requests';

test.describe('My Profile', async () => {
    test.beforeEach(async ({page}) => {
        await mockInitialApiRequests(page);
    });

    test.describe('Posts', () => {
        test('I can view my profile posts', async ({page}) => {
            await mockApi({page, requests: {
                getMyProfile: {
                    method: 'GET',
                    path: '/posts/me',
                    response: myProfilePosts
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
            const myPost = myProfilePosts.posts[0];
            const firstItem = profileItems.first();
            const firstItemText = await firstItem.textContent();

            expect(firstItemText).toContain(myPost.author.name);
            expect(firstItemText).toContain(myPost.title);
            expect(firstItemText).toContain(myPost.excerpt);

            // Check that My Profile shows posts I reposted
            const repostedPost = myProfilePosts.posts[2];
            const thirdItem = profileItems.nth(2);
            const thirdItemText = await thirdItem.textContent();

            expect(thirdItemText).toContain(`${repostedPost.repostedBy?.name}reposted`);
            expect(thirdItemText).toContain(repostedPost.title);

            // Check like/reply/repost counts are visible
            expect(thirdItemText).toContain(repostedPost.likeCount.toString());
            expect(thirdItemText).toContain(repostedPost.replyCount.toString());
            expect(thirdItemText).toContain(repostedPost.repostCount.toString());
        });
    });
});
