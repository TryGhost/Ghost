import {APIKey} from './apiKeys';
import {Meta, createMutation, createQuery} from '../utils/apiRequests';

// Types

export type IntegrationWebhook = {
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

export type Integration = {
    id: string;
    type: 'builtin' | 'core' | 'custom';
    name: string;
    slug: string;
    icon_image: string | null;
    description: string;
    created_at: string;
    updated_at: string;
    api_keys?: APIKey[];
    webhooks?: IntegrationWebhook[];
}

export interface IntegrationsResponseType {
    meta?: Meta;
    integrations: Integration[];
}

// Requests

const dataType = 'IntegrationsResponseType';

export const integrationsDataType = dataType;

export const useBrowseIntegrations = createQuery<IntegrationsResponseType>({
    dataType,
    path: '/integrations/',
    defaultSearchParams: {include: 'api_keys,webhooks'}
});

export const useCreateIntegration = createMutation<IntegrationsResponseType, Partial<Integration>>({
    method: 'POST',
    path: () => '/integrations/',
    body: integration => ({integrations: [integration]}),
    searchParams: () => ({include: 'api_keys,webhooks'}),
    updateQueries: {
        dataType,
        update: (newData, currentData) => ({
            ...(currentData as IntegrationsResponseType),
            integrations: (currentData as IntegrationsResponseType).integrations.concat(newData.integrations)
        })
    }
});

export const useEditIntegration = createMutation<IntegrationsResponseType, Integration>({
    method: 'PUT',
    path: integration => `/integrations/${integration.id}/`,
    body: integration => ({integrations: [integration]}),
    searchParams: () => ({include: 'api_keys,webhooks'}),
    updateQueries: {
        dataType,
        update: (newData, currentData) => ({
            ...(currentData as IntegrationsResponseType),
            integrations: (currentData as IntegrationsResponseType).integrations.map((integration) => {
                const newIntegration = newData.integrations.find(({id}) => id === integration.id);
                return newIntegration || integration;
            })
        })
    }
});

export const useDeleteIntegration = createMutation<unknown, string>({
    method: 'DELETE',
    path: id => `/integrations/${id}/`,
    updateQueries: {
        dataType,
        update: (_, currentData, id) => ({
            ...(currentData as IntegrationsResponseType),
            integrations: (currentData as IntegrationsResponseType).integrations.filter(user => user.id !== id)
        })
    }
});
