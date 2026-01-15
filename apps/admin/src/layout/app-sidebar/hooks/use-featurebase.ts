import {useCallback, useEffect, useRef, useState} from 'react';
import {getFeaturebaseToken} from '@tryghost/admin-x-framework';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useFeatureFlag} from '@/hooks/use-feature-flag';
import {useUserPreferences} from '@/hooks/user-preferences';
import {deferred, type Deferred} from '@/utils/deferred';

type FeaturebaseCallback = (err: unknown, data?: unknown) => void;
type FeaturebaseFunction = (action: string, options: Record<string, unknown>, callback?: FeaturebaseCallback) => void;

declare global {
    interface Window {
        Featurebase?: FeaturebaseFunction;
    }
}

const SDK_URL = 'https://do.featurebase.app/js/sdk.js';
const DEFAULT_BOARD = 'Feature Request';

let featurebaseSDKPromise: Promise<void> | null = null;
function loadFeaturebaseSDK(): Promise<void> {
    if (!featurebaseSDKPromise) {
        featurebaseSDKPromise = new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${SDK_URL}"]`);
            if (existingScript) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = SDK_URL;
            script.onload = () => resolve();
            script.onerror = (event) => {
                script.remove();
                const error = new Error(`[Featurebase] Failed to load SDK from ${SDK_URL}`, {cause: event});
                console.error(error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }
    return featurebaseSDKPromise;
}

interface Featurebase {
    openFeedbackWidget: (options?: {board?: string}) => void;
    preloadFeedbackWidget: () => void;
}

/**
 * Hook for lazy-loading and interacting with the Featurebase feedback widget.
 *
 * The SDK and authentication token are NOT fetched on mount. Instead, loading
 * is deferred until user interaction (hover/focus/click on the Feedback button).
 * This improves initial page load performance.
 */
export function useFeaturebase(): Featurebase {
    const {data: config} = useBrowseConfig();
    const {data: preferences} = useUserPreferences();
    const featureFlagEnabled = useFeatureFlag('featurebaseFeedback');
    const [shouldLoad, setShouldLoad] = useState(false);

    const {organization, enabled} = config?.config.featurebase ?? {};
    const featurebaseEnabled = !!(featureFlagEnabled && enabled);
    const theme = preferences?.nightShift ? 'dark' : 'light';

    // Token is only fetched once shouldLoad becomes true (on user interaction)
    const {data: tokenData} = getFeaturebaseToken({
        enabled: featurebaseEnabled && shouldLoad
    });
    const token = tokenData?.featurebase?.token;

    useEffect(() => {
        if (shouldLoad) {
            loadFeaturebaseSDK().catch((err) => {
                console.error('[Featurebase] Failed to load SDK:', err);
            });
        }
    }, [shouldLoad]);

    const deferredInitRef = useRef<Deferred<void>>(deferred());
    useEffect(() => {
        if (!shouldLoad || !organization || !token) {
            return;
        }
        void featurebaseSDKPromise?.then(() => {
            window.Featurebase?.('initialize_feedback_widget', {
                organization,
                theme,
                defaultBoard: DEFAULT_BOARD,
                featurebaseJwt: token
            }, (err) => {
                // Only gate actions on first init - re-inits (e.g. theme/token changes) are
                // best-effort. Resolving/rejecting an already-settled promise is a no-op.
                if (err) {
                    console.error('[Featurebase] Failed to initialize widget:', err);
                    deferredInitRef.current.reject(err);
                } else {
                    deferredInitRef.current.resolve();
                }
            });
        });
    }, [organization, theme, token, shouldLoad]);

    /**
     * Called on hover/focus to start loading SDK + fetching token in advance.
     * This makes the widget open faster when the user actually clicks.
     */
    const preloadFeedbackWidget = useCallback(() => {
        if (!featurebaseEnabled) {
            return;
        }
        // Trigger SDK loading and initialization via effects above
        setShouldLoad(true);
    }, [featurebaseEnabled]);

    const openFeedbackWidget = useCallback((options?: {board?: string}) => {
        if (!featurebaseEnabled) {
            return;
        }

        setShouldLoad(true);

        void deferredInitRef.current.promise.then(() => {
            window.postMessage({
                target: 'FeaturebaseWidget',
                data: {
                    action: 'openFeedbackWidget',
                    ...(options?.board && {setBoard: options.board})
                }
            }, '*');
        });
    }, [featurebaseEnabled]);

    return {openFeedbackWidget, preloadFeedbackWidget};
}
