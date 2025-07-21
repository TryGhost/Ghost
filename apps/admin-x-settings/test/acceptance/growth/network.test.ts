import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Network settings', async () => {
    test('Network toggle is disabled if the feature is disabled by config', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                limitSocialWeb: {
                                    disabled: true
                                }
                            }
                        }
                    }
                }
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('network');
        const toggle = section.getByRole('switch');

        // Toggle should be unchecked and disabled
        await expect(toggle).not.toBeChecked();
        await expect(toggle).toBeDisabled();

        // Should show disabled message
        await expect(section.getByText('You need to configure a supported custom domain to use this feature.')).toBeVisible();
    });

    test('Network toggle can be turned off', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'social_web', value: true}
                    ]
                }
            },
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'social_web', value: false}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('network');
        const toggle = section.getByRole('switch');

        // Toggle should be checked and enabled
        await expect(toggle).toBeChecked();
        await expect(toggle).toBeEnabled();

        // Should not show disabled message
        await expect(section.getByText('You need to configure a supported custom domain to use this feature.')).not.toBeVisible();

        // Toggle off
        await toggle.click();

        // Verify API call
        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'social_web', value: false}
            ]
        });
    });

    test('Network toggle can be turned on', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: {
                    ...responseFixtures.settings,
                    settings: [
                        ...responseFixtures.settings.settings,
                        {key: 'social_web', value: false}
                    ]
                }
            },
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'social_web', value: true}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('network');
        const toggle = section.getByRole('switch');

        // Toggle should be unchecked but enabled
        await expect(toggle).not.toBeChecked();
        await expect(toggle).toBeEnabled();

        // Should not show disabled message
        await expect(section.getByText('You need to configure a supported custom domain to use this feature.')).not.toBeVisible();

        // Toggle on
        await toggle.click();

        // Verify API call
        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [
                {key: 'social_web', value: true}
            ]
        });
    });
});
