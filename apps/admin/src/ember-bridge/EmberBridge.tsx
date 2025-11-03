import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface EmberBridge {
    state: StateBridge;
}

export interface StateBridge {
    onUpdate: (dataType: string, response: unknown) => void;
    onInvalidate: (dataType: string) => void;
    onDelete: (dataType: string, id: string) => void;
    on: (event: string, callback: (event: EmberDataChangeEvent) => void) => void;
    off: (event: string, callback: (event: EmberDataChangeEvent) => void) => void;
}

declare global {
    interface Window {
        EmberBridge?: EmberBridge;
    }
}

export interface EmberDataChangeEvent {
    operation: 'update' | 'create' | 'delete';
    modelName: string;
    id: string;
    data: Record<string, unknown> | null;
}

/**
 * Maps Ember Data model names to React ResponseType strings.
 * This is the inverse of emberDataTypeMapping in state-bridge.js
 */
const EMBER_TO_REACT_TYPE_MAPPING: Record<string, string> = {
    'integration': 'IntegrationsResponseType',
    'invite': 'InvitesResponseType',
    'offer': 'OffersResponseType',
    'newsletter': 'NewslettersResponseType',
    'recommendation': 'RecommendationResponseType',
    'setting': 'SettingsResponseType',
    'theme': 'ThemesResponseType',
    'tier': 'TiersResponseType',
    'user': 'UsersResponseType',
    'post': 'PostsResponseType',
    'member': 'MembersResponseType',
    'tag': 'TagsResponseType',
    'label': 'LabelsResponseType',
    'webhook': 'WebhooksResponseType'
};

/**
 * Hook to sync Ember Data store changes with React Query cache.
 *
 * This hook listens to Ember Data store events (update, create, delete) and
 * automatically invalidates the corresponding React Query cache entries.
 *
 * This is a temporary bridge during the Ember -> React migration and should be
 * called once at the app level. It will be removed once the migration is complete.
 */
export function useEmberDataSync() {
    const queryClient = useQueryClient();

    useEffect(() => {
        let isSubscribed = false;

        const handler = (event: EmberDataChangeEvent) => {
            const { modelName } = event;
            const reactDataType = EMBER_TO_REACT_TYPE_MAPPING[modelName];

            if (!reactDataType) {
                // Model not configured for syncing, ignore
                return;
            }

            // Invalidate all queries matching this data type
            void queryClient.invalidateQueries({
                predicate: (query) => {
                    // Query keys are structured as [dataType, url]
                    return query.queryKey[0] === reactDataType;
                }
            });
        };

        // Poll for EmberBridge availability since it's created after React shell renders
        const pollInterval = setInterval(() => {
            if (window.EmberBridge?.state) {
                clearInterval(pollInterval);
                window.EmberBridge.state.on('emberDataChange', handler);
                isSubscribed = true;
            }
        }, 100);

        return () => {
            clearInterval(pollInterval);
            if (isSubscribed && window.EmberBridge?.state) {
                window.EmberBridge.state.off('emberDataChange', handler);
            }
        };
    }, [queryClient]);
}
