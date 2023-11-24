import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Metadata settings', async () => {
    test('Supports editing metadata', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'meta_title', value: 'Alternative title'},
                {key: 'meta_description', value: 'Alternative description'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('metadata');

        await section.getByRole('button', {name: 'Edit'}).click();

        await section.getByLabel('Meta title').fill('Alternative title');
        await section.getByLabel('Meta description').fill('Alternative description');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('Meta title')).toHaveCount(0);

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'meta_title', value: 'Alternative title'},
                {key: 'meta_description', value: 'Alternative description'}
            ]
        });
    });
});
