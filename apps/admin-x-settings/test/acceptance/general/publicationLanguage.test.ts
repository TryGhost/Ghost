import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Publication language settings', async () => {
    test('Supports editing the locale', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'locale', value: 'jp'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('publication-language');

        await expect(section.getByText('en')).toHaveCount(1);

        await section.getByRole('button', {name: 'Edit'}).click();

        await section.getByLabel('Site language').fill('jp');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('Site language')).toHaveCount(0);

        await expect(section.getByText('jp')).toHaveCount(1);

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'locale', value: 'jp'}
            ]
        });
    });
});
