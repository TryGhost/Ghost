import {Meta, createQuery} from '../utils/apiRequests';

// Types

export type IntegrationApiKey = {
    id: string;
    type: string;
    secret: string;
    role_id: string;
    integration_id: string;
    user_id: string | null;
    last_seen_at: string | null;
    last_seen_version: string | null;
    created_at: string;
    updated_at: string;
}

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
    api_keys: IntegrationApiKey[];
    webhooks: IntegrationWebhook[];
}

export interface IntegrationsResponseType {
    meta?: Meta;
    integrations: Integration[];
}

// Requests

const dataType = 'IntegrationsResponseType';

export const useBrowseIntegrations = createQuery<IntegrationsResponseType>({
    dataType,
    path: '/integrations/',
    defaultSearchParams: {include: 'api_keys,webhooks'}
});

// export const useEditIntegration = createMutation<IntegrationsResponseType, Integration>({
//     method: 'PUT',
//     path: integration => `/integrations/${integration.id}/`,
//     body: integration => ({integrations: [integration]}),
//     searchParams: () => ({include: 'roles'}),
//     updateQueries: {
//         dataType,
//         update: () => {} // TODO
//     }
// });

// export const useDeleteIntegration = createMutation<DeleteIntegrationResponse, string>({
//     method: 'DELETE',
//     path: id => `/integrations/${id}/`,
//     updateQueries: {
//         dataType,
//         update: (_, currentData, id) => ({
//             ...(currentData as IntegrationsResponseType),
//             integrations: (currentData as IntegrationsResponseType).integrations.filter(user => user.id !== id)
//         })
//     }
// });
