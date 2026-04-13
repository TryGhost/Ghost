import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('X integration', async () => {
    test('Requests X settings and completes the verifier-based connect flow when disconnected', async ({page}) => {
        const connectedSettings = {
            ...responseFixtures.settings,
            settings: responseFixtures.settings.settings.map(setting => ({
                ...setting,
                value: setting.key === 'x_access_token' ? '••••••••' :
                    setting.key === 'x_access_token_secret' ? '••••••••' :
                        setting.key === 'x_username' ? '@testpub' :
                            setting.value
            }))
        };

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            verifyX: {
                method: 'POST',
                path: '/x/verify/',
                response: connectedSettings
            }
        }});

        await page.goto('/');
        await page.evaluate(() => {
            const win = window as Window & {__xOpenArgs?: Array<string | undefined>};
            win.open = (...args) => {
                win.__xOpenArgs = args.map(arg => arg?.toString());
                return null;
            };
        });

        expect(lastApiRequests.browseSettings?.url).toContain('group=');
        expect(lastApiRequests.browseSettings?.url).toContain('x');

        const section = page.getByTestId('integrations');
        await section.getByTestId('x-integration').hover();
        await section.getByRole('button', {name: 'Configure'}).click();

        const xModal = page.getByTestId('x-modal');
        await expect(xModal).toContainText('Connect your publication to X');
        await xModal.getByRole('button', {name: 'Connect with X'}).click();

        await expect(xModal.getByLabel('Verification code')).toBeVisible();
        await expect(xModal).toContainText('A new X authorization tab has been opened');

        const openedUrl = await page.evaluate(() => {
            const win = window as Window & {__xOpenArgs?: Array<string | undefined>};
            return win.__xOpenArgs?.[0] || null;
        });

        expect(openedUrl).toContain('/ghost/api/admin/x/');

        await xModal.getByLabel('Verification code').fill('1234567');
        await xModal.getByRole('button', {name: 'Verify code'}).click();

        await expect.poll(() => lastApiRequests.verifyX?.body).toEqual({
            oauthVerifier: '1234567'
        });
        await expect(xModal).toContainText('@testpub');
    });

    test('Shows connected state and supports disconnecting from X', async ({page}) => {
        const connectedSettings = {
            ...responseFixtures.settings,
            settings: responseFixtures.settings.settings.map(setting => ({
                ...setting,
                value: setting.key === 'x_access_token' ? '••••••••' :
                    setting.key === 'x_access_token_secret' ? '••••••••' :
                        setting.key === 'x_username' ? '@testpub' :
                            setting.value
            }))
        };

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: connectedSettings
            },
            disconnectX: {
                method: 'DELETE',
                path: '/x/',
                responseStatus: 204,
                response: ''
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('integrations');
        await expect(section.getByTestId('x-integration')).toContainText('Active');

        await section.getByTestId('x-integration').hover();
        await section.getByRole('button', {name: 'Configure'}).click();

        const xModal = page.getByTestId('x-modal');
        await expect(xModal).toContainText('@testpub');
        await xModal.getByRole('button', {name: 'Disconnect'}).click();
        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Disconnect'}).click();

        expect(lastApiRequests.disconnectX).toBeTruthy();
    });
});
