import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('History', async () => {
    test('Browsing history', async ({page}) => {
        const securityAction = {
            id: '64d62b327ca62600011d0819',
            resource_id: null,
            resource_type: 'security_action',
            actor_id: '1',
            actor_type: 'user',
            event: 'edited',
            context: '{"action_name":"reset_authentication","api_keys_rotated":4,"users_locked":3}',
            created_at: '2023-08-11T12:37:02.000Z',
            actor: {
                id: '1',
                name: 'Jamie Larson',
                slug: 'main',
                image: null
            }
        };
        const actionsResponse = {
            ...responseFixtures.actions,
            actions: [securityAction, ...responseFixtures.actions.actions]
        };

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseActionsFiltered: {
                method: 'GET',
                path: /\/actions\/.*filter=.*(?:post|event)/,
                response: {
                    ...actionsResponse,
                    actions: actionsResponse.actions.filter(action => action.resource_type !== 'post')
                }
            },
            browseActionsAll: {method: 'GET', path: /\/actions\//, response: actionsResponse}
        }});

        await page.goto('/');

        const historySection = page.getByTestId('history');

        await historySection.getByRole('button', {name: 'View history'}).click();

        const historyModal = page.getByTestId('history-modal');

        await expect(historyModal).toHaveText(/Settings edited: Site \(navigation\) 2 times/);
        await expect(historyModal).toHaveText(/Page edited: The Clunkers Hall of Shame 2 times/);
        await expect(historyModal).toHaveText(/Security action reset authentication: 4 API keys rotated, 3 users locked/);
        await expect(historyModal).not.toHaveText(/Security action reset authentication: \(unknown\)/);

        expect(lastApiRequests.browseActionsAll?.url).toEqual('http://localhost:5173/ghost/api/admin/actions/?include=actor%2Cresource&limit=200&filter=resource_type%3A-%5Blabel%5D');

        await historyModal.getByRole('button', {name: 'Filter'}).click();

        const popoverContent = historyModal.getByTestId('popover-content');

        await popoverContent.getByLabel('Posts').click();
        await expect(popoverContent.getByLabel('Posts')).toHaveAttribute('data-state', 'unchecked');

        await expect(historyModal).not.toHaveText(/Page edited/);
        await expect(historyModal).toHaveText(/Settings edited/);

        expect(lastApiRequests.browseActionsFiltered?.url).toEqual('http://localhost:5173/ghost/api/admin/actions/?include=actor%2Cresource&limit=200&filter=resource_type%3A-%5Blabel%2Cpost%5D');

        const deletedFilterResponse = page.waitForResponse(response => response.url().includes('/ghost/api/admin/actions/')
            && response.url().includes('event%3A-%5Bdeleted%5D')
        );
        await popoverContent.getByLabel('Deleted').click();
        await expect(popoverContent.getByLabel('Deleted')).toHaveAttribute('data-state', 'unchecked');

        await deletedFilterResponse;

        expect(lastApiRequests.browseActionsFiltered?.url).toEqual('http://localhost:5173/ghost/api/admin/actions/?include=actor%2Cresource&limit=200&filter=event%3A-%5Bdeleted%5D%2Bresource_type%3A-%5Blabel%2Cpost%5D');
    });
});
