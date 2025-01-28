import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, responseFixtures, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

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
});

