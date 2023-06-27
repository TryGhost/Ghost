import {expect, test} from '@playwright/test';
import {mockApi} from '../utils/e2e';

test.describe('Search', async () => {
    test('Hiding and showing groups based on the search term', async ({page}) => {
        await mockApi({page});

        await page.goto('/');

        const searchBar = page.getByLabel('Search');

        await searchBar.fill('theme');

        await expect(page.getByTestId('theme')).toBeVisible();
        await expect(page.getByTestId('title-and-description')).not.toBeVisible();

        await searchBar.fill('title');

        await expect(page.getByTestId('theme')).not.toBeVisible();
        await expect(page.getByTestId('title-and-description')).toBeVisible();
    });
});
