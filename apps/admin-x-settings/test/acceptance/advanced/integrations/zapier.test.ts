import {Integration, IntegrationsResponseType} from '@tryghost/admin-x-framework/api/integrations';
import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Zapier integration settings', async () => {
    test('Showing and regenerating API keys', async ({page}) => {
        const zapierIntegration = {
            id: 'zapier-id',
            type: 'builtin',
            slug: 'zapier',
            name: 'Zapier',
            icon_image: null,
            description: 'Built-in Zapier integration',
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
            api_keys: [{
                id: 'zapier-api-key-id',
                type: 'admin',
                secret: 'zapier-api-secret',
                role_id: 'role-id',
                integration_id: 'integration-id',
                user_id: 'user-id',
                last_seen_at: null,
                last_seen_version: null,
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
            }],
            webhooks: []
        } satisfies Integration;

        await mockApi({
            page,
            requests: {
                ...globalDataRequests,
                browseIntegrations: {
                    method: 'GET',
                    path: '/integrations/?include=api_keys%2Cwebhooks&limit=50',
                    response: ({
                        integrations: [zapierIntegration]
                    } satisfies IntegrationsResponseType)
                },
                refreshAPIKey: {
                    method: 'POST',
                    path: /\/api_key\/.+\/refresh/,
                    response: ({
                        integrations: [{
                            ...zapierIntegration,
                            api_keys: [{
                                ...zapierIntegration.api_keys[0],
                                secret: 'new-api-key'
                            }]
                        }]
                    } satisfies IntegrationsResponseType)
                }
            }
        });

        await page.goto('/');

        const integrationsSection = page.getByTestId('integrations');

        await integrationsSection.getByTestId('zapier-integration').hover();
        await integrationsSection.getByTestId('zapier-integration').getByRole('button', {name: 'Configure'}).click();

        const zapierModal = page.getByTestId('zapier-modal');

        await expect(zapierModal).toHaveText(/zapier-api-secret/);
        await zapierModal.getByText('zapier-api-secret').hover();
        await zapierModal.getByRole('button', {name: 'Copy'}).click();

        // Can't consistently check the clipboard contents, sadly https://github.com/microsoft/playwright/issues/13037
        await expect(zapierModal.getByRole('button', {name: 'Copied'})).toHaveCount(1);

        await zapierModal.getByRole('button', {name: 'Regenerate'}).click();
        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Regenerate Admin API Key'}).click();

        await expect(zapierModal).toHaveText(/Admin API Key was successfully regenerated/);
        await expect(zapierModal).toHaveText(/new-api-key/);
    });

    test('Disabled by configured limitations', async ({page}) => {
        await mockApi({page, requests: {...globalDataRequests, browseConfig: {
            ...globalDataRequests.browseConfig,
            response: {
                config: {
                    ...responseFixtures.config.config,
                    hostSettings: {
                        limits: {
                            customIntegrations: {
                                disabled: true
                            }
                        }
                    }
                }
            }
        }}});

        await page.goto('/');

        const integrationsSection = page.getByTestId('integrations');

        await integrationsSection.getByTestId('zapier-integration').hover();
        await expect(integrationsSection.getByTestId('zapier-integration').getByRole('button', {name: 'Upgrade'})).toHaveCount(1);
    });
});
