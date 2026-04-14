import {chooseOptionInSelect, globalDataRequests, mockApi, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';
import {expect, test} from '@playwright/test';

test.describe('Site visibility settings', async () => {
    test('Supports locking and unlocking the site', async ({page}) => {
        const mockLock = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'is_private', value: true},
                {key: 'password', value: 'password'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('access');

        await expect(section.getByTestId('site-visibility-select')).toContainText('Public');

        await chooseOptionInSelect(section.getByTestId('site-visibility-select'), 'Private');
        await section.getByTestId('site-access-code').fill('password');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByTestId('site-visibility-select')).toContainText('Private');

        expect(mockLock.lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'is_private', value: true},
                {key: 'password', value: 'password'}
            ]
        });

        // Remove the site password

        const mockUnlock = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'is_private', value: false}
            ])}
        }});

        await chooseOptionInSelect(section.getByTestId('site-visibility-select'), 'Public');

        await section.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByTestId('site-visibility-select')).toContainText('Public');

        expect(mockUnlock.lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'is_private', value: false}
            ]
        });
    });
});
