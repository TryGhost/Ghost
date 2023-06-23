import {expect, test} from '@playwright/test';
import {mockApi, updatedSettingsResponse} from '../../utils/e2e';

test.describe('Social account settings', async () => {
    test('Supports editing social URLs', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            settings: {
                edit: updatedSettingsResponse([
                    {key: 'facebook', value: 'fb'},
                    {key: 'twitter', value: '@tw'}
                ])
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('social-accounts');

        await expect(section.getByText('https://www.facebook.com/ghost')).toHaveCount(1);
        await expect(section.getByText('https://twitter.com/ghost')).toHaveCount(1);

        await section.getByRole('button', {name: 'Edit'}).click();

        await section.getByLabel(`URL of your publication's Facebook Page`).fill('https://www.facebook.com/fb');
        await section.getByLabel('URL of your Twitter profile').fill('https://twitter.com/tw');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('URL of your Twitter profile')).toHaveCount(0);

        await expect(section.getByText('https://www.facebook.com/fb')).toHaveCount(1);
        await expect(section.getByText('https://twitter.com/tw')).toHaveCount(1);

        expect(lastApiRequests.settings.edit.body).toEqual({
            settings: [
                {key: 'facebook', value: 'fb'},
                {key: 'twitter', value: '@tw'}
            ]
        });
    });
});
