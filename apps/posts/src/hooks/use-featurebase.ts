import {type Deferred, deferred} from '@src/utils/deferred';
import {getFeaturebaseToken} from '@tryghost/admin-x-framework';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useCallback, useEffect, useRef, useState} from 'react';

type FeaturebaseCallback = (err: unknown, data?: unknown) => void;
type FeaturebaseFunction = (action: string, options: Record<string, unknown>, callback?: FeaturebaseCallback) => void;

declare global {
    interface Window {
        Featurebase?: FeaturebaseFunction;
    }
}

const SDK_URL = 'https://do.featurebase.app/js/sdk.js';

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
                featurebaseSDKPromise = null;
                const error = new Error(`[Featurebase] Failed to load SDK from ${SDK_URL}`, {cause: event});
                // eslint-disable-next-line no-console
                console.error(error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }
    return featurebaseSDKPromise;
}

interface Featurebase {
    isAvailable: boolean;
    openFeedbackWidget: (options?: {board?: string}) => void;
    preloadFeedbackWidget: () => void;
}

const getTheme = (): 'light' | 'dark' => {
    if (typeof document === 'undefined') {
        return 'light';
    }
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};

/**
 * Lazy-loads the Featurebase SDK and opens the feedback widget. Mirrors the
 * hook used by the admin sidebar — see apps/admin/src/layout/app-sidebar/hooks/use-featurebase.ts.
 *
 * `isAvailable` reflects whether Featurebase is enabled for the current site
 * (the server only exposes `config.featurebase` when the `featurebaseFeedback`
 * lab is on AND the org config is set, so checking it here is sufficient).
 * Callers still need to gate by user role (e.g. exclude contributors) if
 * relevant to their surface.
 */
export function useFeaturebase(): Featurebase {
    const {data: config} = useBrowseConfig();
    const [shouldLoad, setShouldLoad] = useState(false);

    const {organization, enabled} = config?.config.featurebase ?? {};
    const isAvailable = !!enabled;

    const {data: tokenData} = getFeaturebaseToken({
        enabled: isAvailable && shouldLoad
    });
    const token = tokenData?.featurebase?.token;

    useEffect(() => {
        if (shouldLoad) {
            loadFeaturebaseSDK().catch((err) => {
                // eslint-disable-next-line no-console
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
                theme: getTheme(),
                featurebaseJwt: token
            }, (err) => {
                if (err) {
                    // eslint-disable-next-line no-console
                    console.error('[Featurebase] Failed to initialize widget:', err);
                    deferredInitRef.current.reject(err);
                    deferredInitRef.current = deferred();
                    setShouldLoad(false);
                } else {
                    deferredInitRef.current.resolve();
                }
            });
        });
    }, [organization, token, shouldLoad]);

    const preloadFeedbackWidget = useCallback(() => {
        if (!isAvailable) {
            return;
        }
        setShouldLoad(true);
    }, [isAvailable]);

    const openFeedbackWidget = useCallback((options?: {board?: string}) => {
        if (!isAvailable) {
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
    }, [isAvailable]);

    return {isAvailable, openFeedbackWidget, preloadFeedbackWidget};
}
