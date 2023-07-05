import {expect, test} from '@playwright/test';
import {mockApi, updatedSettingsResponse} from '../../utils/e2e';

test.describe('Site password settings', async () => {
    test('Supports locking and unlocking the site', async ({page}) => {
        let lastApiRequests = await mockApi({page, responses: {
            settings: {
                edit: updatedSettingsResponse([
                    {key: 'is_private', value: true},
                    {key: 'password', value: 'password'}
                ])
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('locksite');

        await expect(section.getByText('Your site is not password protected')).toHaveCount(1);

        // Add a site password

        await section.getByRole('button', {name: 'Edit'}).click();

        await section.getByLabel(/Enable password protection/).check();
        await section.getByLabel('Site password').fill('password');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('Site password')).toHaveCount(0);

        await expect(section.getByText('Your site is password protected')).toHaveCount(1);

        expect(lastApiRequests.settings.edit.body).toEqual({
            settings: [
                {key: 'is_private', value: true},
                {key: 'password', value: 'password'}
            ]
        });

        // Remove the site password

        lastApiRequests = await mockApi({page, responses: {
            settings: {
                edit: updatedSettingsResponse([
                    {key: 'is_private', value: false}
                ])
            }
        }});

        await section.getByRole('button', {name: 'Edit'}).click();

        await section.getByLabel(/Enable password protection/).uncheck();

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByText('Your site is not password protected')).toHaveCount(1);

        expect(lastApiRequests.settings.edit.body).toEqual({
            settings: [
                {key: 'is_private', value: false}
            ]
        });
    });
});
