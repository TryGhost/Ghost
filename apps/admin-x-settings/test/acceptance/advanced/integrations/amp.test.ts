import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, updatedSettingsResponse} from '../../../utils/acceptance';

test.describe('AMP integration', async () => {
    test('Supports toggling and filling in AMP integration', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'amp', value: true},
                {key: 'amp_gtag_id', value: 'UA-1234567-1'}
            ])}
        }});

        await page.goto('/');
        const section = page.getByTestId('integrations');
        const ampElement = section.getByText('AMP').last();
        await ampElement.hover();
        await page.getByRole('button', {name: 'Configure'}).click();
        const ampModal = page.getByTestId('amp-modal');

        const ampToggle = ampModal.getByRole('switch');
        await ampToggle.click();
        const input = ampModal.getByRole('textbox');
        await input.fill('UA-1234567-1');

        await ampModal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'amp', value: true},
                {key: 'amp_gtag_id', value: 'UA-1234567-1'}
            ]
        });
    });

    test('Warns when leaving without saving', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: responseFixtures.settings}
        }});

        await page.goto('/');
        const section = page.getByTestId('integrations');

        const ampElement = section.getByText('AMP').last();
        await ampElement.hover();
        await page.getByRole('button', {name: 'Configure'}).click();
        const ampModal = page.getByTestId('amp-modal');

        const ampToggle = ampModal.getByRole('switch');
        await ampToggle.click();

        await ampModal.getByRole('button', {name: 'Cancel'}).click();

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/leave/i);

        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Leave'}).click();

        await expect(ampModal).toBeHidden();
        expect(lastApiRequests.editSettings).toBeUndefined();
    });
});
