import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, toggleLabsFlag, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Spam prevention settings', async () => {
    test('Supports adding blocked email domains', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'blocked_email_domains', value: '["spam.xyz","junk.com"]'}
            ])}
        }});

        await page.goto('/');
        const section = page.getByTestId('spam-filters');

        await section.getByLabel('Blocked email domains').fill('spam.xyz\njunk.com');
        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'blocked_email_domains', value: '["spam.xyz","junk.com"]'}
            ]
        });
    });

    test('Normalises values when adding blocked email domains', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'blocked_email_domains', value: '["spam.xyz","junk.com"]'}
            ])}
        }});

        await page.goto('/');
        const section = page.getByTestId('spam-filters');

        await section.getByLabel('Blocked email domains').fill('hello@Spam.xyz\n@junk.com');
        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'blocked_email_domains', value: '["spam.xyz","junk.com"]'}
            ]
        });
    });

    test('Can read and remove existing list of blocked email domains', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {method: 'GET', path: /^\/settings\/\?group=/, response: {
                meta: {...responseFixtures.settings.meta},
                settings: [
                    ...responseFixtures.settings.settings,
                    {
                        key: 'blocked_email_domains', value: '["initial.xyz","junk.com"]'
                    }
                ]
            }},
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'blocked_email_domains', value: '[]'}
            ])}
        }});

        await page.goto('/');
        const section = page.getByTestId('spam-filters');

        // Read the existing list
        await expect(section.getByLabel('Blocked email domains')).toHaveValue('initial.xyz\njunk.com');

        // Remove existing values
        await section.getByLabel('Blocked email domains').fill('');
        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'blocked_email_domains', value: '[]'}
            ]
        });
    });

    test('Can edit the existing list of blocked email domains', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {method: 'GET', path: /^\/settings\/\?group=/, response: {
                meta: {...responseFixtures.settings.meta},
                settings: [
                    ...responseFixtures.settings.settings,
                    {
                        key: 'blocked_email_domains', value: '["initial.xyz","junk.com"]'
                    }
                ]
            }},
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'blocked_email_domains', value: '["spam.xyz","junk.com"]'}
            ])}
        }});

        await page.goto('/');
        const section = page.getByTestId('spam-filters');

        // Read existing list
        await expect(section.getByLabel('Blocked email domains')).toHaveValue('initial.xyz\njunk.com');

        // Edit existing list
        await section.getByLabel('Blocked email domains').fill('spam.xyz\njunk.com');
        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [{key: 'blocked_email_domains', value: '["spam.xyz","junk.com"]'}]
        });
    });

    test.describe('Turnstile', () => {
        test('Is hidden when the labs flag is off', async ({page}) => {
            toggleLabsFlag('turnstile', false);

            await mockApi({page, requests: {
                ...globalDataRequests
            }});

            await page.goto('/');
            const section = page.getByTestId('spam-filters');

            await expect(section.getByLabel('Blocked email domains')).toBeVisible();
            await expect(section.getByLabel('Turnstile site key')).toBeHidden();
            await expect(section.getByLabel('Turnstile secret key')).toBeHidden();
        });

        test('Supports setting the Turnstile keys and shows the third-party form warning', async ({page}) => {
            toggleLabsFlag('turnstile', true);

            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
                editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                    {key: 'turnstile_sitekey', value: '1x00000000000000000000BB'},
                    {key: 'turnstile_secret_key', value: 'test-secret-key'}
                ])}
            }});

            await page.goto('/');
            const section = page.getByTestId('spam-filters');

            await expect(section.getByText(/custom or third-party signup forms/)).toBeVisible();

            await section.getByLabel('Turnstile site key').fill('1x00000000000000000000BB');
            await section.getByLabel('Turnstile secret key').fill('test-secret-key');
            await section.getByRole('button', {name: 'Save'}).click();

            expect(lastApiRequests.editSettings?.body).toEqual({
                settings: [
                    {key: 'turnstile_sitekey', value: '1x00000000000000000000BB'},
                    {key: 'turnstile_secret_key', value: 'test-secret-key'}
                ]
            });
        });

        test('Requires both keys to be set together', async ({page}) => {
            toggleLabsFlag('turnstile', true);

            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests
            }});

            await page.goto('/');
            const section = page.getByTestId('spam-filters');

            await section.getByLabel('Turnstile site key').fill('1x00000000000000000000BB');
            await section.getByRole('button', {name: 'Save'}).click();

            await expect(section.getByText(/Enter both a site key and a secret key/)).toBeVisible();
            expect(lastApiRequests.editSettings).toBeUndefined();
        });

        test('Can clear both keys to disable Turnstile', async ({page}) => {
            toggleLabsFlag('turnstile', true);

            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
                browseSettings: {method: 'GET', path: /^\/settings\/\?group=/, response: {
                    meta: {...responseFixtures.settings.meta},
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'turnstile_sitekey', value: '1x00000000000000000000BB'},
                        {key: 'turnstile_secret_key', value: '••••••••'}
                    ]
                }},
                editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                    {key: 'turnstile_sitekey', value: null},
                    {key: 'turnstile_secret_key', value: null}
                ])}
            }});

            await page.goto('/');
            const section = page.getByTestId('spam-filters');

            await expect(section.getByLabel('Turnstile site key')).toHaveValue('1x00000000000000000000BB');

            await section.getByLabel('Turnstile site key').fill('');
            await section.getByLabel('Turnstile secret key').fill('');
            await section.getByRole('button', {name: 'Save'}).click();

            expect(lastApiRequests.editSettings?.body).toEqual({
                settings: [
                    {key: 'turnstile_sitekey', value: null},
                    {key: 'turnstile_secret_key', value: null}
                ]
            });
        });
    });
});

