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
        const select = section.getByTestId('timezone-select');

        await expect(select).toBeVisible();

        await chooseOptionInSelect(select, '(GMT -9:00) Alaska');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(select).toBeVisible();
        await expect(select).toContainText('(GMT -9:00) Alaska');

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'timezone', value: 'America/Anchorage'}
            ]
        });
    });
});
