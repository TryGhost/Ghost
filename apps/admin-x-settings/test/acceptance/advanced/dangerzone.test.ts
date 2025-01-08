import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('DangerZone', async () => {
    test('Delete all content', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            deleteAllContent: {method: 'DELETE', path: '/db/', response: {}}
        }});

        await page.goto('/');

        const dangeZoneSection = page.getByTestId('dangerzone');

        await dangeZoneSection.getByRole('button', {name: 'Delete all content'}).click();

        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Delete'}).click();

        await expect(page.getByTestId('toast-success')).toContainText('All content deleted from database');

        expect(lastApiRequests.deleteAllContent).toBeTruthy();
    });
});
