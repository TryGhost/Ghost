import { useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

export interface EmberBridge {
    state: StateBridge;
}

export type StateBridgeEventMap = {
    emberDataChange: EmberDataChangeEvent;
    emberAuthChange: EmberAuthChangeEvent;
    subscriptionChange: SubscriptionState;
    sidebarVisibilityChange: SidebarVisibilityChangeEvent;
    routeChange: RouteChangeEvent;
}

export interface StateBridge {
    onUpdate: (dataType: string, response: unknown) => void;
    onInvalidate: (dataType: string) => void;
    onDelete: (dataType: string, id: string) => void;
    on<K extends keyof StateBridgeEventMap>(event: K, callback: (event: StateBridgeEventMap[K]) => void): void;
    off<K extends keyof StateBridgeEventMap>(event: K, callback: (event: StateBridgeEventMap[K]) => void): void;
    sidebarVisible: boolean;
    getRouteUrl: (routeName: string, queryParams?: Record<string, string | null> | null) => string;
    isRouteActive: (routeNames: string | string[], queryParams?: Record<string, string | null> | null) => boolean;
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

export interface EmberAuthChangeEvent {
    isAuthenticated: boolean;
}

export interface SubscriptionState {
    subscription?: {
        isActiveTrial: boolean;
        trial_end: string | null;
        status: string;
    };
}

export interface SidebarVisibilityChangeEvent {
    isVisible: boolean;
}

export interface RouteChangeEvent {
    routeName: string;
    queryParams: Record<string, unknown>;
}

export type EmberRouting = Pick<StateBridge, 'getRouteUrl' | 'isRouteActive'>;

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
 * Gets the StateBridge, waiting for EmberBridge to load if necessary.
 *
 * This polls indefinitely because we may lazy-load Ember in the future
 * once more of the app is migrated to React.
 *
 * @returns Function to unsubscribe from the StateBridge polling
 */
function waitForStateBridge(onReady: (stateBridge: StateBridge) => void): () => void {
    if (typeof window === 'undefined') {
        return () => {};
    }

    if (window.EmberBridge?.state) {
        onReady(window.EmberBridge.state);
        return () => {};
    }

    const interval = setInterval(() => {
        if (window.EmberBridge?.state) {
            clearInterval(interval);
            onReady(window.EmberBridge.state);
        }
    }, 100);

    return () => clearInterval(interval);
}

function onEmberStateBridgeEvent<K extends keyof StateBridgeEventMap>(
    event: K,
    handler: (event: StateBridgeEventMap[K]) => void
): () => void {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    const stopPolling = waitForStateBridge((stateBridge) => {
        if (!isMounted) {
            return;
        }
        stateBridge.on(event, handler);
        unsubscribe = () => stateBridge.off(event, handler);
    });

    return () => {
        isMounted = false;
        stopPolling();
        unsubscribe?.();
    };
}

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
        const handleEmberDataChange = (event: EmberDataChangeEvent) => {
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

        return onEmberStateBridgeEvent('emberDataChange', handleEmberDataChange);
    }, [queryClient]);

}

/**
 * Hook to sync Ember authentication state with React Query cache.
 *
 * This hook listens to Ember authentication state changes and automatically
 * invalidates the React Query cache when the user signs in.
 *
 * This is a temporary bridge during the Ember -> React migration and should be
 * called once at the app level. It will be removed once the migration is complete.
 */

export function useEmberAuthSync() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const handleEmberAuthChange = (event: EmberAuthChangeEvent) => {
            if (event.isAuthenticated) {
                void queryClient.invalidateQueries();
            }
        };

        return onEmberStateBridgeEvent('emberAuthChange', handleEmberAuthChange);
    }, [queryClient]);

}

export function useSubscriptionStatus() {
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionState | null>(null);

    useEffect(() => {
        const handleSubscriptionChange = (payload: SubscriptionState) => {
            setSubscriptionStatus(payload);
        };

        return onEmberStateBridgeEvent('subscriptionChange', handleSubscriptionChange);
    }, []);

    return subscriptionStatus;
}

// External store for sidebar visibility state
function subscribeSidebarVisibility(callback: () => void): () => void {
    return onEmberStateBridgeEvent('sidebarVisibilityChange', callback);
}

function getSidebarVisibility(): boolean {
    // Always read from Ember as the source of truth
    return window.EmberBridge?.state.sidebarVisible ?? true;
}

/**
 * Hook to sync sidebar visibility state from Ember.
 *
 * This hook uses useSyncExternalStore to listen to sidebar visibility changes
 * triggered by Ember routes (e.g., hiding the sidebar when entering the editor).
 *
 * This is a temporary bridge during the Ember -> React migration and should be
 * removed once the editor is ported to React.
 */
export function useSidebarVisibility(): boolean {
    return useSyncExternalStore(
        subscribeSidebarVisibility,
        getSidebarVisibility,
        getSidebarVisibility // Server snapshot (same as client for now)
    );
}

// Default no-op routing for when the bridge isn't available yet
const defaultRouting: EmberRouting = {
    getRouteUrl: (routeName) => routeName,
    isRouteActive: () => false
};

/**
 * Hook to access Ember routing state.
 * Returns routing methods that re-render when Ember's route changes.
 *
 * @example
 * ```tsx
 * const routing = useEmberRouting();
 * const postsUrl = routing.getRouteUrl('posts');
 * const customUrl = routing.getRouteUrl('posts', {type: 'draft'});
 * const isActive = routing.isRouteActive('posts', {type: 'draft'});
 * ```
 */
export function useEmberRouting(): EmberRouting {
    const [bridge, setBridge] = useState<StateBridge | null>(() => window.EmberBridge?.state ?? null);
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        // Wait for bridge to be available
        if (!bridge) {
            return waitForStateBridge(setBridge);
        }

        // Subscribe to route changes to force re-renders
        const handleRouteChange = () => {
            forceUpdate(n => n + 1);
        };

        bridge.on('routeChange', handleRouteChange);
        return () => bridge.off('routeChange', handleRouteChange);
    }, [bridge]);

    // Return default no-op routing until bridge is available
    if (!bridge) {
        return defaultRouting;
    }

    return {
        getRouteUrl: bridge.getRouteUrl,
        isRouteActive: bridge.isRouteActive
    };
}

/**
 * Hook to get the forceUpgrade state.
 *
 * Returns true when the site is in force upgrade mode (requires billing action).
 *
 * Force upgrade state is determined by:
 * 1. Config hostSettings.forceUpgrade (set by server, requires restart to change)
 * 2. Subscription status (if subscription becomes 'active', forceUpgrade is cleared)
 */
export function useForceUpgrade(): boolean {
    const { data: config } = useBrowseConfig();
    const subscriptionStatus = useSubscriptionStatus();

    const configForceUpgrade = config?.config?.hostSettings?.forceUpgrade;

    // If config doesn't have forceUpgrade, we're not in force upgrade mode
    if (!configForceUpgrade) {
        return false;
    }

    // If subscription has become active, billing was completed successfully
    // The server config hasn't restarted yet, but we can clear forceUpgrade locally
    if (subscriptionStatus?.subscription?.status === 'active') {
        return false;
    }

    return true;
}

