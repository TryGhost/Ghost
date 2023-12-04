import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../utils/acceptance';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Layout', async () => {
    test('Confirms when leaving if a section is dirty', async ({page}) => {
        await mockApi({page, requests: globalDataRequests});

        await page.goto('/');

        const section = page.getByTestId('title-and-description');

        await section.getByRole('button', {name: 'Edit'}).click();

        await section.getByLabel('Site title').fill('New Site Title');

        await page.getByTestId('exit-settings').click();

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/leave/i);
    });
});
