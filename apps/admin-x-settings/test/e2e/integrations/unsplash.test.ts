import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, updatedSettingsResponse} from '../../utils/e2e';

test.describe('Unsplash integration', async () => {
    test('Supports toggling unsplash integration modal', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'unsplash', value: true}
            ])}
        }});

        await page.goto('/');
        const section = await page.getByTestId('integrations'); // add await here
        const unsplashElement = await section.getByText('Unsplash').last();
        await unsplashElement.hover();
        await page.getByRole('button', {name: 'Configure'}).click();
        const unsplashModal = await page.getByTestId('unsplash-modal');
        await page.getByRole('button', {name: 'Close'}).click();
        expect(unsplashModal).not.toBeVisible();
    });

    test('Supports toggling unsplash integration', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'unsplash', value: false}
            ])}
        }});

        await page.goto('/');
        const section = await page.getByTestId('integrations'); // add await here
        const unsplashElement = await section.getByText('Unsplash').last();
        await unsplashElement.hover();
        await page.getByRole('button', {name: 'Configure'}).click();
        const unsplashModal = await page.getByTestId('unsplash-modal');
        
        const unsplashToggle = await unsplashModal.getByRole('switch');
        await unsplashToggle.click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'unsplash', value: false}
            ]
        });
    });
});
