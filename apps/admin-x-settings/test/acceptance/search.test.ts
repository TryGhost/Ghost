import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../utils/acceptance';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Search', async () => {
    test('Hiding and showing groups based on the search term', async ({page}) => {
        await mockApi({page, requests: globalDataRequests});

        await page.goto('/');

        const searchBar = page.getByLabel('Search');

        await searchBar.fill('design');

        await expect(page.getByTestId('design')).toBeVisible();
        await expect(page.getByTestId('title-and-description')).not.toBeVisible();

        await searchBar.fill('title');

        await expect(page.getByTestId('design')).not.toBeVisible();
        await expect(page.getByTestId('title-and-description')).toBeVisible();
    });
});
