import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, toggleLabsFlag} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('DangerZone', async () => {
    test('Delete all content', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            deleteAllContent: {method: 'DELETE', path: '/db/', response: {}}
        }});

        await page.goto('/');

        const dangerZone = page.getByTestId('dangerzone');
        await dangerZone.getByRole('button', {name: 'Delete all content'}).click();

        const modal = page.getByTestId('confirmation-modal');
        await modal.getByRole('button', {name: 'Delete', exact: true}).click();

        await expect(page.getByTestId('toast-success')).toContainText('All content deleted from database');

        expect(lastApiRequests.deleteAllContent).toBeTruthy();
    });

    test('Reset all authentication', async ({page}) => {
        toggleLabsFlag('dangerZoneResetAuth', true);

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            resetAuth: {
                method: 'POST',
                path: '/authentication/reset/',
                response: {
                    security_action: [{action: 'reset_authentication', api_keys_rotated: 4, users_locked: 3}]
                }
            }
        }});

        await page.goto('/');

        const dangerZone = page.getByTestId('dangerzone');
        await dangerZone.getByRole('button', {name: 'Reset all authentication'}).click();

        const modal = page.getByTestId('confirmation-modal');
        await modal.getByRole('button', {name: 'Reset all authentication'}).click();

        expect(lastApiRequests.resetAuth).toBeTruthy();
    });

    test('Reset all gift links', async ({page}) => {
        toggleLabsFlag('giftLinks', true);

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            removeAllGiftLinks: {
                method: 'PUT',
                path: '/gift_links/remove_all/',
                response: {meta: {count: 3}}
            }
        }});

        await page.goto('/');

        const dangerZone = page.getByTestId('dangerzone');
        await dangerZone.getByTestId('reset-all-gift-links').getByRole('button', {name: 'Reset'}).click();

        const modal = page.getByTestId('confirmation-modal');
        await modal.getByRole('button', {name: 'Reset all gift links'}).click();

        await expect(page.getByTestId('toast-success')).toContainText('Reset 3 gift links');

        expect(lastApiRequests.removeAllGiftLinks).toBeTruthy();
    });
});
