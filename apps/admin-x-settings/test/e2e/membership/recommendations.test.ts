import {expect, test} from '@playwright/test';

test.describe('Recommendations settings', async () => {
    test('Supports creating a new recommendation', async ({page}) => {
        await page.goto('/');

        const section = page.getByTestId('recommendations');

        await section.getByRole('button', {name: 'Add recommendation'}).click();

        const modal = page.getByTestId('add-recommendation-modal');

        await modal.getByRole('button', {name: 'Next'}).click();

        await expect(modal).toHaveText(/Please enter a valid URL./);

        await modal.getByLabel('URL').fill('https://main.ghost.org');

        await modal.getByRole('button', {name: 'Next'}).click();

        await expect(modal).toHaveText(/Preview/);
        
        await expect(modal.getByLabel('Title')).toHaveText(/Main X/);
        await expect(modal.getByLabel('Short description')).toHaveText(/Main X/);

        await modal.getByRole('button', {name: 'Add'}).click();

        await expect(page.getByTestId('toast')).toHaveText(/Successfully added a recommendation/);
    });
});
