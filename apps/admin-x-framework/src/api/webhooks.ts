import {Meta, createMutation} from '../utils/api/hooks';
import {IntegrationsResponseType, integrationsDataType} from './integrations';

// Types

export type Webhook = {
    id: string;
    event: string;
    target_url: string;
    name: string;
    secret: string | null;
    api_version: string;
    integration_id: string;
    last_triggered_at: string | null;
    last_triggered_status: string | null;
    last_triggered_error: string | null;
    created_at: string;
    updated_at: string;
}

export interface WebhooksResponseType {
    meta?: Meta;
    webhooks: Webhook[];
}

// Requests

export const useCreateWebhook = createMutation<WebhooksResponseType, Partial<Webhook>>({
    method: 'POST',
    path: () => '/webhooks/',
    body: webhook => ({webhooks: [webhook]}),
    updateQueries: {
        dataType: integrationsDataType,
        emberUpdateType: 'createOrUpdate',
        update: (newData, currentData) => (currentData && {
            ...(currentData as IntegrationsResponseType),
            integrations: (currentData as IntegrationsResponseType).integrations.map((integration) => {
                const webhook = newData.webhooks[0];

                if (webhook.integration_id === integration.id) {
                    return {...integration, webhooks: [...(integration.webhooks || []), webhook]};
                }

                return integration;
            })
        })
    }
});

export const useEditWebhook = createMutation<WebhooksResponseType, Webhook>({
    method: 'PUT',
    path: webhook => `/webhooks/${webhook.id}/`,
    body: webhook => ({webhooks: [webhook]}),
    updateQueries: {
        dataType: integrationsDataType,
        emberUpdateType: 'createOrUpdate',
        update: (newData, currentData) => (currentData && {
            ...(currentData as IntegrationsResponseType),
            integrations: (currentData as IntegrationsResponseType).integrations.map(integration => ({
                ...integration,
                webhooks: integration.webhooks?.map(webhook => (
                    webhook.id === newData.webhooks[0].id ? newData.webhooks[0] : webhook
                ))
            }))
        })
    }
});

export const useDeleteWebhook = createMutation<unknown, string>({
    method: 'DELETE',
    path: id => `/webhooks/${id}/`,
    updateQueries: {
        dataType: integrationsDataType,
        emberUpdateType: 'createOrUpdate',
        update: (_, currentData, id) => ({
            ...(currentData as IntegrationsResponseType),
            integrations: (currentData as IntegrationsResponseType).integrations.map(integration => ({
                ...integration,
                webhooks: integration.webhooks?.filter(webhook => webhook.id !== id)
            }))
        })
    }
});
