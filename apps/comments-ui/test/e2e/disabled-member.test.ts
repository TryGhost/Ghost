import {MockedApi, initialize} from '../utils/e2e';
import {buildMember} from '../utils/fixtures';
import {expect, test} from '@playwright/test';

test.describe('Disabled member', async () => {
    test.describe('with support email configured', async () => {
        test('shows disabled message instead of comment form', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComments(2);
            mockedApi.setMember({
                name: 'Disabled Member',
                can_comment: false
            });

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                settings: {support_email_address: 'support@example.com'}
            });

            // Should show disabled box instead of CTA or form
            const disabledBox = frame.getByTestId('commenting-disabled-box');
            await expect(disabledBox).toBeVisible();
            await expect(disabledBox).toContainText('Commenting disabled');
            await expect(disabledBox).toContainText("You can't post comments in this publication");
            await expect(disabledBox).toContainText('Contact support');

            // Should not show the main form
            const form = frame.getByTestId('form');
            await expect(form).toHaveCount(0);

            // Should not show CTA box
            const ctaBox = frame.getByTestId('cta-box');
            await expect(ctaBox).not.toBeVisible();
        });

        test('support link has correct mailto href', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComments(1);
            mockedApi.setMember({
                can_comment: false
            });

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                settings: {support_email_address: 'help@publication.com'}
            });

            const disabledBox = frame.getByTestId('commenting-disabled-box');
            const supportLink = disabledBox.locator('a');
            await expect(supportLink).toHaveAttribute('href', 'mailto:help@publication.com');
        });
    });

    test.describe('without support email configured', async () => {
        test('shows disabled message without contact support link', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComments(2);
            mockedApi.setMember({
                can_comment: false
            });
            // No support email configured (no settings.support_email_address passed)

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly'
            });

            const disabledBox = frame.getByTestId('commenting-disabled-box');
            await expect(disabledBox).toBeVisible();
            await expect(disabledBox).toContainText('Commenting disabled');
            await expect(disabledBox).toContainText("You can't post comments in this publication");

            // Should NOT contain contact support link
            await expect(disabledBox).not.toContainText('Contact support');
        });
    });

    test.describe('interaction restrictions', async () => {
        test('hides reply button', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComments(2);
            mockedApi.setMember({
                can_comment: false
            });

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly'
            });

            // Reply buttons should be hidden for disabled members
            const replyButton = frame.getByTestId('reply-button');
            await expect(replyButton).toHaveCount(0);
        });

        test('shows like count but not interactive', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComment({
                html: '<p>Comment with likes</p>',
                count: {likes: 5}
            });
            mockedApi.setMember({
                can_comment: false
            });

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly'
            });

            // Should show like count (read-only)
            const likeCount = frame.getByTestId('like-count');
            await expect(likeCount).toBeVisible();
            await expect(likeCount).toContainText('5');

            // Should NOT show like button (interactive)
            const likeButton = frame.getByTestId('like-button');
            await expect(likeButton).toHaveCount(0);
        });

        test('hides more menu on own comments', async ({page}) => {
            const disabledMember = buildMember({
                name: 'Disabled Author',
                can_comment: false
            });

            const mockedApi = new MockedApi({});
            // Add a comment by the disabled member
            mockedApi.addComment({
                html: '<p>My own comment</p>',
                member: disabledMember
            });
            // Add a comment by someone else
            mockedApi.addComment({
                html: '<p>Someone elses comment</p>',
                member: buildMember({name: 'Other Member'})
            });
            mockedApi.setMember(disabledMember);

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly'
            });

            // More button should only appear once (for the other member's comment, to report)
            // It should be hidden on the disabled member's own comment
            const moreButtons = frame.getByTestId('more-button');
            await expect(moreButtons).toHaveCount(1);
        });
    });

    test.describe('can_comment undefined (backwards compatibility)', async () => {
        test('allows commenting when can_comment is not set', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.addComments(1);
            // Member without can_comment field (old API response)
            mockedApi.setMember({
                name: 'Legacy Member'
                // can_comment is undefined
            });

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly'
            });

            // Should show the main form (can comment)
            const form = frame.getByTestId('form');
            await expect(form).toHaveCount(1);

            // Should NOT show disabled box
            const disabledBox = frame.getByTestId('commenting-disabled-box');
            await expect(disabledBox).not.toBeVisible();

            // Should show reply buttons
            const replyButton = frame.getByTestId('reply-button');
            await expect(replyButton).toHaveCount(1);

            // Should show like button (interactive)
            const likeButton = frame.getByTestId('like-button');
            await expect(likeButton).toHaveCount(1);
        });
    });
});
