import {type Deferred, deferred} from '../utils/deferred';
import {getFeaturebaseToken} from '../api/featurebase';
import {useBrowseConfig} from '../api/config';
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
                if (window.Featurebase) {
                    resolve();
                    return;
                }
                existingScript.addEventListener('load', () => resolve(), {once: true});
                existingScript.addEventListener('error', reject, {once: true});
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

// Featurebase's SDK silently drops a second `initialize_feedback_widget` call —
// the callback never fires, leaving any deferred awaiting it stuck forever.
// Multiple hook instances (sidebar + embedded apps) must therefore share a
// single init promise.
let sharedInitPromise: Promise<void> | null = null;

function initFeaturebaseWidget(organization: string, theme: 'light' | 'dark', token: string): Promise<void> {
    if (sharedInitPromise) {
        return sharedInitPromise;
    }
    sharedInitPromise = loadFeaturebaseSDK().then(() => new Promise<void>((resolve, reject) => {
        window.Featurebase?.('initialize_feedback_widget', {
            organization,
            theme,
            featurebaseJwt: token
        }, (err) => {
            if (err) {
                sharedInitPromise = null;
                reject(err);
            } else {
                resolve();
            }
        });
    }));
    sharedInitPromise.catch(() => {
        sharedInitPromise = null;
    });
    return sharedInitPromise;
}

/**
 * Lazy-loads the Featurebase SDK and opens the feedback widget.
 *
 * `isAvailable` reflects whether Featurebase is enabled for the current site.
 * The server only exposes `config.featurebase` when the `featurebaseFeedback`
 * lab is on AND the org config is set, so checking it here is sufficient.
 * Callers still need to gate by user role (e.g. exclude contributors) if
 * relevant to their surface.
 *
 * The SDK and JWT are NOT fetched on mount — loading is deferred until the
 * first call to `openFeedbackWidget` or `preloadFeedbackWidget`, so initial
 * page load isn't slowed down.
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
        initFeaturebaseWidget(organization, getTheme(), token).then(
            () => deferredInitRef.current.resolve(),
            (err) => {
                // eslint-disable-next-line no-console
                console.error('[Featurebase] Failed to initialize widget:', err);
                deferredInitRef.current.reject(err);
                deferredInitRef.current = deferred();
                setShouldLoad(false);
            }
        );
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
