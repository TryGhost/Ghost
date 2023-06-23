import {expect, test} from '@playwright/test';
import {mockApi, updatedSettingsResponse} from '../../utils/e2e';

test.describe('Metadata settings', async () => {
    test('Supports editing metadata', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            settings: {
                edit: updatedSettingsResponse([
                    {key: 'meta_title', value: 'Alternative title'},
                    {key: 'meta_description', value: 'Alternative description'}
                ])
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('metadata');

        await expect(section.getByText('Test Site')).toHaveCount(1);
        await expect(section.getByText('Thoughts, stories and ideas.')).toHaveCount(1);

        await section.getByRole('button', {name: 'Edit'}).click();

        await section.getByLabel('Meta title').fill('Alternative title');
        await section.getByLabel('Meta description').fill('Alternative description');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('Meta title')).toHaveCount(0);

        await expect(section.getByText('Alternative title')).toHaveCount(1);
        await expect(section.getByText('Alternative description')).toHaveCount(1);

        expect(lastApiRequests.settings.edit.body).toEqual({
            settings: [
                {key: 'meta_title', value: 'Alternative title'},
                {key: 'meta_description', value: 'Alternative description'}
            ]
        });
    });
});
