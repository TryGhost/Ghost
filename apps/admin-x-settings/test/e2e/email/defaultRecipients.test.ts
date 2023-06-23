import {expect, test} from '@playwright/test';
import {mockApi, updatedSettingsResponse} from '../../utils/e2e';

test.describe('Default recipient settings', async () => {
    test('Supports editing default recipients', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            settings: {
                edit: updatedSettingsResponse([
                    {key: 'editor_default_email_recipients', value: 'filter'},
                    {key: 'editor_default_email_recipients_filter', value: 'status:-free'}
                ])
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('default-recipients');

        await expect(section.getByText('Whoever has access to the post')).toHaveCount(1);

        await section.getByRole('button', {name: 'Edit'}).click();
        await section.getByLabel('Default newsletter recipients').selectOption('All members');
        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.settings.edit.body).toEqual({
            settings: [
                {key: 'editor_default_email_recipients', value: 'filter'},
                {key: 'editor_default_email_recipients_filter', value: 'status:free,status:-free'}
            ]
        });

        await section.getByRole('button', {name: 'Edit'}).click();
        await section.getByLabel('Default newsletter recipients').selectOption('Usually nobody');
        await section.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.settings.edit.body).toEqual({
            settings: [
                {key: 'editor_default_email_recipients', value: 'filter'},
                {key: 'editor_default_email_recipients_filter', value: null}
            ]
        });

        await section.getByRole('button', {name: 'Edit'}).click();
        await section.getByLabel('Default newsletter recipients').selectOption('Paid-members only');
        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('Default newsletter recipients')).toHaveCount(0);

        await expect(section.getByText('Paid-members only')).toHaveCount(1);

        expect(lastApiRequests.settings.edit.body).toEqual({
            settings: [
                {key: 'editor_default_email_recipients', value: 'filter'},
                {key: 'editor_default_email_recipients_filter', value: 'status:-free'}
            ]
        });
    });
});
