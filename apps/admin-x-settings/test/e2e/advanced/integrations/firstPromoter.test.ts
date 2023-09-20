import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, updatedSettingsResponse} from '../../../utils/e2e';

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
});
