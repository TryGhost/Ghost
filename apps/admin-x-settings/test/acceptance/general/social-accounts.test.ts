import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, testUrlValidation, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

const editedSocialSettings = [
    {key: 'facebook', value: 'fb', label: 'Facebook', displayValue: 'https://www.facebook.com/fb'},
    {key: 'twitter', value: '@tw', label: 'X', displayValue: 'https://x.com/tw'},
    {key: 'linkedin', value: 'ghost-team', label: 'LinkedIn', displayValue: 'https://www.linkedin.com/in/ghost-team'},
    {key: 'bluesky', value: 'ghost.bsky.social', label: 'Bluesky', displayValue: 'https://bsky.app/profile/ghost.bsky.social'},
    {key: 'threads', value: '@ghostteam', label: 'Threads', displayValue: 'https://www.threads.net/@ghostteam'},
    {key: 'mastodon', value: 'mastodon.social/@ghost', label: 'Mastodon', displayValue: 'https://mastodon.social/@ghost'},
    {key: 'tiktok', value: '@ghostteam', label: 'TikTok', displayValue: 'https://www.tiktok.com/@ghostteam'},
    {key: 'youtube', value: '@ghostteam', label: 'YouTube', displayValue: 'https://www.youtube.com/@ghostteam'},
    {key: 'instagram', value: 'ghostteam', label: 'Instagram', displayValue: 'https://www.instagram.com/ghostteam'}
] as const;

const sortSettings = <T extends {key: string}>(settings: T[]) => {
    return [...settings].sort((left, right) => left.key.localeCompare(right.key));
};

test.describe('Social account settings', async () => {
    test('Supports editing all publication social URLs', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse(editedSocialSettings.map(({key, value}) => ({key, value})))}
        }});

        await page.goto('/');

        const section = page.getByTestId('social-accounts');

        await expect(section.getByLabel('Facebook')).toHaveValue('https://www.facebook.com/ghost');
        await expect(section.getByLabel('X')).toHaveValue('https://x.com/ghost');

        for (const field of editedSocialSettings) {
            await section.getByLabel(field.label).fill(field.displayValue);
        }

        await section.getByRole('button', {name: 'Save'}).click();

        for (const field of editedSocialSettings) {
            await expect(section.getByLabel(field.label)).toHaveValue(field.displayValue);
        }

        expect(sortSettings((lastApiRequests.editSettings?.body as {settings: Array<{key: string; value: string}>} | undefined)?.settings ?? [])).toEqual(
            sortSettings(editedSocialSettings.map(({key, value}) => ({key, value})))
        );
    });

    test('Restores values on cancel', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests
        }});

        await page.goto('/');

        const section = page.getByTestId('social-accounts');
        const linkedinInput = section.getByLabel('LinkedIn');
        const instagramInput = section.getByLabel('Instagram');

        await linkedinInput.fill('https://www.linkedin.com/in/ghost-team');
        await instagramInput.fill('https://www.instagram.com/ghostteam');

        await section.getByRole('button', {name: 'Cancel'}).click();

        await expect(linkedinInput).toHaveValue('');
        await expect(instagramInput).toHaveValue('');
    });

    test('Formats and validates the URLs', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests
        }});

        await page.goto('/');

        const section = page.getByTestId('social-accounts');

        const facebookInput = section.getByLabel('Facebook');
        await expect(facebookInput).toBeVisible();

        await testUrlValidation(
            facebookInput,
            'facebook.com/username',
            'https://www.facebook.com/username'
        );

        await testUrlValidation(
            facebookInput,
            'testuser',
            'https://www.facebook.com/testuser'
        );

        await testUrlValidation(
            facebookInput,
            'ab99',
            'https://www.facebook.com/ab99'
        );

        await testUrlValidation(
            facebookInput,
            'page/ab99',
            'https://www.facebook.com/page/ab99'
        );

        await testUrlValidation(
            facebookInput,
            'page/*(&*(%%))',
            'https://www.facebook.com/page/*(&*(%%))'
        );

        await testUrlValidation(
            facebookInput,
            'facebook.com/pages/some-facebook-page/857469375913?ref=ts',
            'https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts'
        );

        await testUrlValidation(
            facebookInput,
            'https://www.facebook.com/groups/savethecrowninn',
            'https://www.facebook.com/groups/savethecrowninn'
        );

        await testUrlValidation(
            facebookInput,
            'http://github.com/username',
            '',
            'The URL must be in a format like https://www.facebook.com/yourPage'
        );

        await testUrlValidation(
            facebookInput,
            'facebook.com/valid',
            'https://www.facebook.com/valid'
        );

        await testUrlValidation(
            facebookInput,
            'http://github.com/pages/username',
            '',
            'The URL must be in a format like https://www.facebook.com/yourPage'
        );

        const twitterInput = section.getByLabel('X');

        await testUrlValidation(
            twitterInput,
            'twitter.com/username',
            'https://x.com/username'
        );

        await testUrlValidation(
            twitterInput,
            'testuser',
            'https://x.com/testuser'
        );

        await testUrlValidation(
            twitterInput,
            'http://github.com/username',
            'https://x.com/username'
        );

        await testUrlValidation(
            twitterInput,
            '*(&*(%%))',
            '',
            'The URL must be in a format like https://x.com/yourUsername'
        );

        await testUrlValidation(
            twitterInput,
            'testuser',
            'https://x.com/testuser'
        );

        await testUrlValidation(
            twitterInput,
            'thisusernamehasmorethan15characters',
            '',
            'Your Username is not a valid Twitter Username'
        );

        await testUrlValidation(
            section.getByLabel('LinkedIn'),
            'ghost-team',
            'https://www.linkedin.com/in/ghost-team'
        );

        await testUrlValidation(
            section.getByLabel('LinkedIn'),
            'https://github.com/ghost',
            '',
            'The URL must be in a format like https://www.linkedin.com/in/yourUsername'
        );

        await testUrlValidation(
            section.getByLabel('Bluesky'),
            'ghost.bsky.social',
            'https://bsky.app/profile/ghost.bsky.social'
        );

        await testUrlValidation(
            section.getByLabel('Threads'),
            '@ghostteam',
            'https://www.threads.net/@ghostteam'
        );

        await testUrlValidation(
            section.getByLabel('Mastodon'),
            '@ghost@mastodon.social',
            'https://mastodon.social/@ghost'
        );

        await testUrlValidation(
            section.getByLabel('TikTok'),
            'ghostteam',
            'https://www.tiktok.com/@ghostteam'
        );

        await testUrlValidation(
            section.getByLabel('YouTube'),
            '@ghostteam',
            'https://www.youtube.com/@ghostteam'
        );

        await testUrlValidation(
            section.getByLabel('Instagram'),
            'ghostteam',
            'https://www.instagram.com/ghostteam'
        );
    });
});
