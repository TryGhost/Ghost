import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('History', async () => {
    test('Browsing history', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseActionsFiltered: {
                method: 'GET',
                path: /\/actions\/.+post/,
                response: {
                    ...responseFixtures.actions,
                    actions: responseFixtures.actions.actions.filter(action => action.resource_type !== 'post')
                }
            },
            browseActionsAll: {method: 'GET', path: /\/actions\//, response: responseFixtures.actions}
        }});

        await page.goto('/');

        const historySection = page.getByTestId('history');

        await historySection.getByRole('button', {name: 'View history'}).click();

        const historyModal = page.getByTestId('history-modal');

        await expect(historyModal).toHaveText(/Settings edited: Site \(navigation\) 2 times/);
        await expect(historyModal).toHaveText(/Page edited: The Clunkers Hall of Shame 2 times/);

        expect(lastApiRequests.browseActionsAll?.url).toEqual('http://localhost:5173/ghost/api/admin/actions/?include=actor%2Cresource&limit=200&filter=resource_type%3A-%5Blabel%5D');

        await historyModal.getByRole('button', {name: 'Filter'}).click();

        const popoverContent = historyModal.getByTestId('popover-content');

        await popoverContent.getByLabel('Posts').click();
        await expect(popoverContent.getByLabel('Posts')).toHaveAttribute('data-state', 'unchecked');

        await expect(historyModal).not.toHaveText(/Page edited/);
        await expect(historyModal).toHaveText(/Settings edited/);

        expect(lastApiRequests.browseActionsFiltered?.url).toEqual('http://localhost:5173/ghost/api/admin/actions/?include=actor%2Cresource&limit=200&filter=resource_type%3A-%5Blabel%2Cpost%5D');

        await popoverContent.getByLabel('Deleted').click();
        await expect(popoverContent.getByLabel('Deleted')).toHaveAttribute('data-state', 'unchecked');

        expect(lastApiRequests.browseActionsFiltered?.url).toEqual('http://localhost:5173/ghost/api/admin/actions/?include=actor%2Cresource&limit=200&filter=event%3A-%5Bdeleted%5D%2Bresource_type%3A-%5Blabel%2Cpost%5D');
    });
});
