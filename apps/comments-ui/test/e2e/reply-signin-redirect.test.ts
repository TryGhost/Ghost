import {MockedApi, initialize} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Comment sign-in redirect', async () => {
    test('Sign in from a reply CTA asks Portal to return to that comment', async ({page}) => {
        const mockedApi = new MockedApi({});
        const commentId = '64a1b2c3d4e5f6a7b8c9d0e1';
        mockedApi.addComment({
            id: commentId,
            html: '<p>Comment to reply to</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        // A logged-out reader clicks Reply, which opens the sign-in CTA.
        await frame.getByTestId('reply-button').first().click();
        const ctaFrame = page.frameLocator('iframe[title="ctaPopup"]');
        await expect(ctaFrame.getByTestId('signin-button')).toBeVisible();

        // Clicking "Sign in" routes to Portal's sign-in with a redirect back to the
        // comment, so Portal returns the reader there (via the permalink fragment)
        // after authenticating — no client-side storage involved.
        await ctaFrame.getByTestId('signin-button').click();

        await expect.poll(() => page.url()).toContain('#/portal/signin?redirect=');
        expect(decodeURIComponent(page.url())).toContain(`#ghost-comments-${commentId}`);
    });

    test('Sign in from a like CTA asks Portal to return to that comment', async ({page}) => {
        const mockedApi = new MockedApi({});
        const commentId = '64a1b2c3d4e5f6a7b8c9d0e2';
        mockedApi.addComment({
            id: commentId,
            html: '<p>Comment to like</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        // A logged-out reader clicks Like, which opens the same sign-in CTA.
        await frame.getByTestId('like-button').first().click();
        const ctaFrame = page.frameLocator('iframe[title="ctaPopup"]');
        await expect(ctaFrame.getByTestId('signin-button')).toBeVisible();

        await ctaFrame.getByTestId('signin-button').click();

        await expect.poll(() => page.url()).toContain('#/portal/signin?redirect=');
        expect(decodeURIComponent(page.url())).toContain(`#ghost-comments-${commentId}`);
    });

    test('Sign in from the generic CTA (no comment) has no redirect', async ({page}) => {
        const mockedApi = new MockedApi({});
        // No comments → the inline "Start the conversation" CTA, not opened from a reply.
        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        await expect(frame.getByTestId('cta-box')).toBeVisible();
        await frame.getByTestId('signin-button').click();

        await expect.poll(() => page.url()).toContain('#/portal/signin');
        expect(page.url()).not.toContain('redirect=');
    });
});
