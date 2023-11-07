import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, toggleLabsFlag} from '../../utils/acceptance';

test.describe('Offers Modal', () => {
    test.beforeEach(async () => {
        toggleLabsFlag('adminXOffers', true);
    });
    
    test('Offers Modal is available', async ({page}) => {
        await mockApi({page, requests: {...globalDataRequests}});
        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await expect(modal).toBeVisible();
    });
});