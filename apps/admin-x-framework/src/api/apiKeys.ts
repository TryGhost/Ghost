import {createMutation} from '../utils/api/hooks';
import {IntegrationsResponseType, integrationsDataType} from './integrations';

// Types

export type APIKey = {
    id: string;
    type: 'admin' | 'content';
    secret: string;
    role_id: string;
    integration_id: string;
    user_id: string | null;
    last_seen_at: string | null;
    last_seen_version: string | null;
    created_at: string;
    updated_at: string;
}

// Requests

export const useRefreshAPIKey = createMutation<IntegrationsResponseType, {integrationId: string, apiKeyId: string}>({
    method: 'POST',
    path: ({integrationId, apiKeyId}) => `/integrations/${integrationId}/api_key/${apiKeyId}/refresh/`,
    body: ({integrationId}) => ({integrations: [{id: integrationId}]}),
    updateQueries: {
        emberUpdateType: 'createOrUpdate',
        dataType: integrationsDataType,
        update: (newData, currentData) => (currentData && {
            ...(currentData as IntegrationsResponseType),
            integrations: (currentData as IntegrationsResponseType).integrations.map((integration) => {
                const newIntegration = newData.integrations.find(({id}) => id === integration.id);
                return newIntegration || integration;
            })
        })
    }
});
