import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../../utils/acceptance';
import {mockApi, responseFixtures, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('First Promoter integration', async () => {
    test('Supports toggling and filling in First Promoter integration', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'firstpromoter', value: true},
                {key: 'firstpromoter_id', value: '123456789'}
            ])}
        }});

        await page.goto('/');
        const section = page.getByTestId('integrations');
        const fpElement = section.getByText('FirstPromoter').last();
        await fpElement.hover();
        await page.getByRole('button', {name: 'Configure'}).click();
        const fpModal = page.getByTestId('firstpromoter-modal');

        const fpToggle = fpModal.getByRole('switch');
        await fpToggle.click();
        const input = fpModal.getByRole('textbox');
        await input.fill('123456789');

        await fpModal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'firstpromoter', value: true},
                {key: 'firstpromoter_id', value: '123456789'}
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

        const fpElement = section.getByText('FirstPromoter').last();
        await fpElement.hover();
        await page.getByRole('button', {name: 'Configure'}).click();
        const fpModal = page.getByTestId('firstpromoter-modal');

        const fpToggle = fpModal.getByRole('switch');
        await fpToggle.click();

        await fpModal.getByRole('button', {name: 'Close'}).click();

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/leave/i);

        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Leave'}).click();

        await expect(fpModal).toBeHidden();
        expect(lastApiRequests.editSettings).toBeUndefined();
    });
});
