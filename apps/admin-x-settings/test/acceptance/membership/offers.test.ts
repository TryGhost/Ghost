import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, toggleLabsFlag} from '../../utils/acceptance';

test.describe('Offers Modal', () => {
    test.beforeEach(async () => {
        toggleLabsFlag('adminXOffers', true);
    });

    test('Renders active offers', async ({}) => {
        
    });

    test('Renders archived offers', async ({}) => {
        
    });

    test('Closes the modal', async ({page}) => {
        await mockApi({page, requests: {...globalDataRequests}});
        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await modal.getByRole('button', {name: 'OK'}).click();
        await expect(modal).not.toBeVisible();
    });

    test('Learn about offers link is present', async ({page}) => {
        await mockApi({page, requests: {...globalDataRequests}});
        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await expect(modal.getByText('→ Learn about offers in Ghost')).toBeVisible();
        await modal.getByText('→ Learn about offers in Ghost').click();
    });
});