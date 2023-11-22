import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Mailgun settings', async () => {
    test('Supports setting up mailgun', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'mailgun_domain', value: 'test.com'},
                {key: 'mailgun_api_key', value: 'test'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('mailgun');

        await expect(section.getByText('Mailgun is not set up')).toHaveCount(1);

        await section.getByRole('button', {name: 'Edit'}).click();

        await section.getByLabel('Mailgun domain').fill('test.com');
        await section.getByLabel('Mailgun private API key').fill('test');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByLabel('Mailgun domain')).toHaveCount(0);

        await expect(section.getByText('Mailgun is set up')).toHaveCount(1);

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'mailgun_domain', value: 'test.com'},
                {key: 'mailgun_api_key', value: 'test'}
            ]
        });
    });
});
