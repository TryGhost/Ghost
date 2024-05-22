import {chooseOptionInSelect, mockApi, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';
import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';

test.describe('Time zone settings', async () => {
    test('Supports editing the time zone', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'timezone', value: 'America/Anchorage'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('timezone');

        await expect(section.getByText('(GMT) UTC')).toHaveCount(1);

        await section.getByRole('button', {name: 'Edit'}).click();

        await chooseOptionInSelect(section.getByTestId('timezone-select'), '(GMT -9:00) Alaska');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByTestId('timezone-select')).toHaveCount(0);

        await expect(section.getByText('(GMT -9:00) Alaska')).toHaveCount(1);

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'timezone', value: 'America/Anchorage'}
            ]
        });
    });
});
