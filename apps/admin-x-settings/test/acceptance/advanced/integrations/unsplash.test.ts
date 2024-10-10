import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../../utils/acceptance';
import {mockApi, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Unsplash integration', async () => {
    test('Supports toggling unsplash integration', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'unsplash', value: false}
            ])}
        }});

        await page.goto('/');
        const section = page.getByTestId('integrations');
        const unsplashElement = section.getByText('Unsplash').last();
        await unsplashElement.hover();
        await page.getByRole('button', {name: 'Configure'}).click();
        const unsplashModal = page.getByTestId('unsplash-modal');

        const unsplashToggle = unsplashModal.getByRole('switch');
        await unsplashToggle.click();

        await unsplashModal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'unsplash', value: false}
            ]
        });
    });
});
