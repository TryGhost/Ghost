import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, testUrlValidation, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

const NEW_PLATFORM_KEYS = ['threads', 'bluesky', 'mastodon', 'tiktok', 'youtube', 'instagram', 'linkedin'];

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

    test('Hides the new platform fields when the backend has not deployed the migration yet', async ({page}) => {
        // Simulates an admin running ahead of its backend: the settings response
        // is missing the keys added by the publication-social-account-settings
        // migration. The UI should fall back to facebook + twitter only so the
        // user can't enter values that would be silently dropped by a backend
        // that doesn't list them in EDITABLE_SETTINGS.
        const settingsWithoutNewKeys = {
            ...responseFixtures.settings,
            settings: responseFixtures.settings.settings.filter(s => !NEW_PLATFORM_KEYS.includes(s.key))
        };

        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {method: 'GET', path: /^\/settings\/\?group=/, response: settingsWithoutNewKeys}
        }});

        await page.goto('/');

        const section = page.getByTestId('social-accounts');

        await expect(section.getByLabel('Facebook')).toBeVisible();
        await expect(section.getByLabel('X')).toBeVisible();

        for (const label of ['LinkedIn', 'Bluesky', 'Threads', 'Mastodon', 'TikTok', 'YouTube', 'Instagram']) {
            await expect(section.getByLabel(label)).toHaveCount(0);
        }
    });

    test('Shows all new platform fields when any new key is present, even if linkedin is missing', async ({page}) => {
        // Defends against the canary being a single hardcoded key. The migration adds
        // all 7 keys atomically today, but the UI gate should treat the presence of
        // any of them as sufficient — so a future migration that drops/renames just
        // one key doesn't silently hide the entire panel.
        const settingsWithoutLinkedin = {
            ...responseFixtures.settings,
            settings: responseFixtures.settings.settings.filter(s => s.key !== 'linkedin')
        };

        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {method: 'GET', path: /^\/settings\/\?group=/, response: settingsWithoutLinkedin}
        }});

        await page.goto('/');

        const section = page.getByTestId('social-accounts');

        for (const label of ['Facebook', 'X', 'LinkedIn', 'Bluesky', 'Threads', 'Mastodon', 'TikTok', 'YouTube', 'Instagram']) {
            await expect(section.getByLabel(label)).toBeVisible();
        }
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
            'http://github.com/username',
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
            'http://github.com/pages/username',
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
            'http://github.com/username',
            'The URL must be in a format like https://x.com/yourUsername'
        );

        await testUrlValidation(
            twitterInput,
            '*(&*(%%))',
            '*(&*(%%))',
            'Your Username is not a valid Twitter Username'
        );

        await testUrlValidation(
            twitterInput,
            'testuser',
            'https://x.com/testuser'
        );

        await testUrlValidation(
            twitterInput,
            'thisusernamehasmorethan15characters',
            'thisusernamehasmorethan15characters',
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
            'https://github.com/ghost',
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

    test('Does not clear the field when invalid input follows a valid value', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests
        }});

        await page.goto('/');

        const instagramInput = page.getByTestId('social-accounts').getByLabel('Instagram');

        await instagramInput.fill('ghostteam');
        await instagramInput.blur();
        await expect(instagramInput).toHaveValue('https://www.instagram.com/ghostteam');

        await instagramInput.fill('https://www.instagram.com/ghostteam.');
        await expect(instagramInput).toHaveValue('https://www.instagram.com/ghostteam.');
        await expect(instagramInput.locator('xpath=../..')).toContainText('Your Username is not a valid Instagram Username');
    });

    test('Does not rewrite the Mastodon field while typing a handle', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests
        }});

        await page.goto('/');

        const mastodonInput = page.getByTestId('social-accounts').getByLabel('Mastodon');

        await mastodonInput.focus();
        await mastodonInput.pressSequentially('@ghost@example.com');
        await expect(mastodonInput).toHaveValue('@ghost@example.com');

        await mastodonInput.blur();
        await expect(mastodonInput).toHaveValue('https://example.com/@ghost');
    });

    test('Allows entering a federated Mastodon URL', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests
        }});

        await page.goto('/');

        const mastodonInput = page.getByTestId('social-accounts').getByLabel('Mastodon');

        await mastodonInput.focus();
        await mastodonInput.pressSequentially('https://mastodon.social/@ghost@example.com');
        await expect(mastodonInput).toHaveValue('https://mastodon.social/@ghost@example.com');

        await mastodonInput.blur();
        await expect(mastodonInput).toHaveValue('https://mastodon.social/@ghost@example.com');
        await expect(mastodonInput.locator('xpath=../..')).not.toContainText('The URL must be in a format');
    });

    test('Saving an unrelated field does not block on a stale stored value that predates a rule tightening', async ({page}) => {
        // Threads' username rule was tightened after this handle could have
        // been stored (trailing period, previously accepted). Editing an
        // untouched Threads field must not be re-validated on save, or a
        // legacy value like this would lock the whole form.
        const settingsWithStaleThreads = {
            ...responseFixtures.settings,
            settings: responseFixtures.settings.settings.map(s => (
                s.key === 'threads' ? {...s, value: '@ghost.tld.'} : s
            ))
        };

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {method: 'GET', path: /^\/settings\/\?group=/, response: settingsWithStaleThreads},
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([{key: 'facebook', value: 'fb'}])}
        }});

        await page.goto('/');

        const section = page.getByTestId('social-accounts');

        // the stale value displays raw rather than crashing, and shows no error
        await expect(section.getByLabel('Threads')).toHaveValue('@ghost.tld.');
        await expect(section).not.toContainText('The URL must be in a format like https://www.threads.net/@yourUsername');

        await section.getByLabel('Facebook').fill('fb');
        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section).not.toContainText('The URL must be in a format like https://www.threads.net/@yourUsername');
        expect((lastApiRequests.editSettings?.body as {settings: Array<{key: string; value: string}>} | undefined)?.settings)
            .toEqual([{key: 'facebook', value: 'fb'}]);
    });

    test('Blocks save when a field the user just edited is invalid, even on its first edit', async ({page}) => {
        // A field's first-ever edit this session never becomes `dirty` if
        // it's invalid (normalizeSocialInput throws before updateSetting is
        // called), so save-time validation must track "did the user attempt
        // to change this" separately from the settings' own dirty flag —
        // otherwise, as long as some *other* field is validly dirty (enabling
        // the Save button), this invalid, in-progress edit is silently
        // skipped and the rest of the form saves as if nothing were wrong.
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([{key: 'facebook', value: 'fb'}])}
        }});

        await page.goto('/');

        const section = page.getByTestId('social-accounts');

        // Facebook is validly dirty, so the Save button is enabled
        await section.getByLabel('Facebook').fill('fb');
        // Instagram's first-ever edit this session is invalid and never committed
        await section.getByLabel('Instagram').fill('john..smith'); // consecutive periods

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section).toContainText('Your Username is not a valid Instagram Username');
        expect(lastApiRequests.editSettings).toBeUndefined();
    });
});
