import {Meta, createMutation, createQuery} from '../utils/api/hooks';
import {APIKey} from './apiKeys';
import {Webhook} from './webhooks';

// Types

export type Integration = {
    id: string;
    type: 'builtin' | 'core' | 'custom';
    name: string;
    slug: string;
    icon_image: string | null;
    description: string | null;
    created_at: string;
    updated_at: string;
    api_keys?: APIKey[];
    webhooks?: Webhook[];
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
        emberUpdateType: 'createOrUpdate',
        update: (newData, currentData) => (currentData && {
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
        emberUpdateType: 'createOrUpdate',
        update: (newData, currentData) => (currentData && {
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
        emberUpdateType: 'delete',
        update: (_, currentData, id) => ({
            ...(currentData as IntegrationsResponseType),
            integrations: (currentData as IntegrationsResponseType).integrations.filter(user => user.id !== id)
        })
    }
});
