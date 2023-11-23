import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../utils/acceptance';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Routing', async () => {
    test('Reopens the opened modal when refreshing the page', async ({page}) => {
        await mockApi({page, requests: globalDataRequests});

        await page.goto('/');

        const section = page.getByTestId('portal');
        await section.getByRole('button', {name: 'Customize'}).click();

        await page.waitForSelector('[data-testid="portal-modal"]');

        expect(page.url()).toMatch(/\/portal\/edit$/);

        await page.reload();

        await page.waitForSelector('[data-testid="portal-modal"]');

        expect(page.url()).toMatch(/\/portal\/edit$/);
    });
});
