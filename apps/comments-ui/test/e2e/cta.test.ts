import {MockedApi, initialize} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('CTA', async () => {
    test('Shows CTA when not logged in', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComments(2);

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        const ctaBox = await frame.getByTestId('cta-box');
        await expect(ctaBox).toBeVisible();

        await expect(ctaBox).toContainText('Join the discussion');
        await expect(ctaBox).toContainText('Become a member of Publisher Weekly to start commenting');
        await expect(ctaBox).toContainText('Sign in');
    });

    test('Shows different CTA if no comments', async ({page}) => {
        const mockedApi = new MockedApi({});

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        const ctaBox = await frame.getByTestId('cta-box');
        await expect(ctaBox).toBeVisible();

        await expect(ctaBox).toContainText('Start the conversation');
    });

    test('Shows CTA when logged in, but not a paid member and comments are paid only', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.addComments(2);
        mockedApi.setMember({
            status: 'free'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            commentsEnabled: 'paid'
        });

        const ctaBox = await frame.getByTestId('cta-box');
        await expect(ctaBox).toBeVisible();

        await expect(ctaBox).toContainText('Join the discussion');
        await expect(ctaBox).toContainText('Become a paid member of Publisher Weekly to start commenting');

        // Don't show sign in button
        await expect(ctaBox).not.toContainText('Sign in');
    });
});

