import {Integration, IntegrationsResponseType} from '@tryghost/admin-x-framework/api/integrations';
import {Webhook, WebhooksResponseType} from '@tryghost/admin-x-framework/api/webhooks';
import {chooseOptionInSelect, limitRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';
import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../../utils/acceptance';

test.describe('Custom integrations', async () => {
    test('Supports creating an integration and adding webhooks', async ({page}) => {
        const integration = {
            id: 'custom-id',
            type: 'custom',
            slug: 'my-integration',
            name: 'My integration',
            icon_image: null,
            description: null,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
            api_keys: [{
                id: 'admin-key-id',
                type: 'admin',
                secret: 'admin-api-secret',
                role_id: 'role-id',
                integration_id: 'my-integration',
                user_id: 'user-id',
                last_seen_at: null,
                last_seen_version: null,
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
            }, {
                id: 'content-key-id',
                type: 'content',
                secret: 'content-api-secret',
                role_id: 'role-id',
                integration_id: 'my-integration',
                user_id: 'user-id',
                last_seen_at: null,
                last_seen_version: null,
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
            }]
        } satisfies Integration;

        const webhook = {
            id: 'webhook-id',
            event: 'post.created',
            target_url: 'https://example.com',
            name: 'My webhook',
            secret: null,
            api_version: 'v3',
            integration_id: integration.id,
            last_triggered_at: null,
            last_triggered_status: null,
            last_triggered_error: null,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z'
        } satisfies Webhook;

        await mockApi({
            page,
            requests: {
                ...globalDataRequests,
                browseIntegrations: {
                    method: 'GET',
                    path: '/integrations/?include=api_keys%2Cwebhooks',
                    response: {integrations: []} satisfies IntegrationsResponseType
                },
                addIntegration: {
                    method: 'POST',
                    path: '/integrations/?include=api_keys%2Cwebhooks',
                    response: {integrations: [integration]} satisfies IntegrationsResponseType
                },
                editIntegration: {
                    method: 'PUT',
                    path: `/integrations/${integration.id}/?include=api_keys%2Cwebhooks`,
                    response: {integrations: [{
                        ...integration,
                        description: 'Test description'
                    }]} satisfies IntegrationsResponseType
                },
                deleteIntegration: {
                    method: 'DELETE',
                    path: `/integrations/${integration.id}/`,
                    response: null
                },
                createWebhook: {
                    method: 'POST',
                    path: '/webhooks/',
                    response: {webhooks: [webhook]} satisfies WebhooksResponseType
                },
                editWebhook: {
                    method: 'PUT',
                    path: `/webhooks/${webhook.id}/`,
                    response: {webhooks: [{
                        ...webhook,
                        name: 'Updated webhook'
                    }]} satisfies WebhooksResponseType
                },
                deleteWebhook: {
                    method: 'DELETE',
                    path: `/webhooks/${webhook.id}/`,
                    response: null
                },
                refreshAPIKey: {
                    method: 'POST',
                    path: /\/api_key\/.+\/refresh/,
                    response: ({
                        integrations: [{
                            ...integration,
                            api_keys: [{
                                ...integration.api_keys[0],
                                secret: 'new-api-key'
                            }]
                        }]
                    } satisfies IntegrationsResponseType)
                }
            }
        });

        await page.goto('/');

        const integrationsSection = page.getByTestId('integrations');

        await integrationsSection.getByRole('button', {name: 'Add custom integration'}).click();

        const createModal = page.getByTestId('add-integration-modal');

        // Validation

        await createModal.getByRole('button', {name: 'Add'}).click();
        await expect(createModal).toHaveText(/Name is required/);

        // Successful creation

        await createModal.getByLabel('Name').fill('My integration');
        await createModal.getByRole('button', {name: 'Add'}).click();

        const modal = page.getByTestId('custom-integration-modal');

        // Warns when leaving without saving

        await modal.getByLabel('Description').fill('Test description');

        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/leave/i);

        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Stay'}).click();

        // Regenerate API key

        await expect(modal).toHaveText(/admin-api-secret/);
        await modal.getByText('admin-api-secret').hover();
        await modal.getByRole('button', {name: 'Regenerate'}).click();
        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Regenerate Admin API Key'}).click();

        await expect(modal).toHaveText(/Admin API Key was successfully regenerated/);
        await expect(modal).toHaveText(/new-api-key/);

        // Create webhook

        await modal.getByRole('button', {name: 'Add webhook'}).click();

        const webhookModal = page.getByTestId('webhook-modal');

        await webhookModal.getByLabel('Name').fill('My webhook');
        await webhookModal.getByLabel('Target URL').fill('https://example.com');
        await chooseOptionInSelect(webhookModal.getByTestId('event-select'), 'Post created');

        await webhookModal.getByRole('button', {name: 'Add'}).click();

        await expect(modal).toHaveText(/My webhook/);

        // Edit webhook

        await modal.getByText('My webhook').click();

        await webhookModal.getByLabel('Name').fill('Updated webhook');
        await webhookModal.getByRole('button', {name: 'Update'}).click();

        await expect(modal).toHaveText(/Updated webhook/);

        // Delete webhook

        await modal.getByText('Updated webhook').hover();
        await modal.getByRole('button', {name: 'Delete'}).click();
        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Delete webhook'}).click();

        await expect(modal).not.toHaveText(/Updated webhook/);

        // Edit integration

        await modal.getByLabel('Description').fill('Test description');
        await modal.getByRole('button', {name: 'Save'}).click();
        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(integrationsSection).toHaveText(/Test description/);

        // Delete integration

        await integrationsSection.getByText('My integration').hover();
        await integrationsSection.getByRole('button', {name: 'Delete'}).click();
        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Delete integration'}).click();

        await expect(integrationsSection).not.toHaveText(/My integration/);
    });

    test('Limits creating custom integrations', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseConfig: {
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
            }
        }});

        await page.goto('/');

        const integrationsSection = page.getByTestId('integrations');

        await integrationsSection.getByRole('button', {name: 'Add custom integration'}).click();

        await expect(page.getByTestId('limit-modal')).toHaveText(/Your plan does not support custom integrations/);
    });
});
