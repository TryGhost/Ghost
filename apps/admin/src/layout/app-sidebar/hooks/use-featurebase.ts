import {useCallback, useEffect, useRef, useState} from 'react';
import {getFeaturebaseToken} from '@tryghost/admin-x-framework';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useFeatureFlag} from '@/hooks/use-feature-flag';
import {useUserPreferences} from '@/hooks/user-preferences';

type FeaturebaseCallback = (err: unknown, data?: unknown) => void;
type FeaturebaseFunction = (action: string, options: Record<string, unknown>, callback?: FeaturebaseCallback) => void;

declare global {
    interface Window {
        Featurebase?: FeaturebaseFunction & {q?: unknown[]};
    }
}

const SDK_URL = 'https://do.featurebase.app/js/sdk.js';

function loadFeaturebaseSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
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

        // Set up the queue function while script loads
        if (typeof window.Featurebase !== 'function') {
            window.Featurebase = function (...args: unknown[]) {
                (window.Featurebase!.q = window.Featurebase!.q || []).push(args);
            } as FeaturebaseFunction & {q?: unknown[]};
        }
    });
}

interface Featurebase {
    openFeedbackWidget: (options?: {board?: string}) => void;
    preloadFeedbackWidget: () => void;
}

export function useFeaturebase(): Featurebase {
    const {data: currentUser} = useCurrentUser();
    const {data: config} = useBrowseConfig();
    const {data: preferences} = useUserPreferences();
    const featureFlagEnabled = useFeatureFlag('featurebaseFeedback');

    const [pendingOpen, setPendingOpen] = useState<{board?: string} | null>(null);
    const [shouldLoad, setShouldLoad] = useState(false);

    const loadPromiseRef = useRef<Promise<void> | null>(null);
    const initStateRef = useRef<{
        ready: {token: string; theme: string} | null;
        inFlight: {promise: Promise<void>; token: string; theme: string} | null;
    }>({ready: null, inFlight: null});

    const {organization, enabled} = config?.config.featurebase ?? {};
    const featurebaseEnabled = !!(featureFlagEnabled && enabled);
    const theme = preferences?.nightShift ? 'dark' : 'light';

    const {data: tokenData} = getFeaturebaseToken({
        enabled: featurebaseEnabled && shouldLoad
    });
    const token = tokenData?.featurebase?.token;
    const hasInitPrereqs = !!(featurebaseEnabled && organization && currentUser && token);

    const ensureSdkLoaded = useCallback(() => {
        if (!loadPromiseRef.current) {
            loadPromiseRef.current = loadFeaturebaseSDK().catch((error) => {
                loadPromiseRef.current = null;
                throw error;
            });
        }

        return loadPromiseRef.current;
    }, []);

    const ensureInitialized = useCallback(async () => {
        if (!hasInitPrereqs) {
            return false;
        }

        const {ready, inFlight} = initStateRef.current;
        if (ready?.token === token && ready?.theme === theme) {
            return true;
        }

        const matchesCurrent = inFlight?.token === token && inFlight?.theme === theme;
        if (inFlight && matchesCurrent) {
            try {
                await inFlight.promise;
                return true;
            } catch {
                if (initStateRef.current.inFlight?.promise === inFlight.promise) {
                    initStateRef.current.inFlight = null;
                }
            }
        }

        const initPromise = ensureSdkLoaded().then(() => new Promise<void>((resolve, reject) => {
            window.Featurebase?.('initialize_feedback_widget', {
                organization,
                theme,
                defaultBoard: 'Feature Request',
                featurebaseJwt: token
            }, (err) => {
                if (err) {
                    console.error('[Featurebase] Failed to initialize widget:', err);
                    reject(err as Error);
                } else {
                    resolve();
                }
            });
        }));

        initStateRef.current.inFlight = {promise: initPromise, token, theme};

        try {
            await initPromise;
            if (initStateRef.current.inFlight?.promise === initPromise) {
                initStateRef.current.ready = {theme, token};
                initStateRef.current.inFlight = null;
            }
            return true;
        } catch {
            if (initStateRef.current.inFlight?.promise === initPromise) {
                initStateRef.current.inFlight = null;
            }
            return false;
        }
    }, [ensureSdkLoaded, organization, hasInitPrereqs, theme, token]);

    const preloadFeedbackWidget = useCallback(() => {
        if (!featurebaseEnabled || !organization) {
            return;
        }

        setShouldLoad(true);
        void ensureSdkLoaded().catch(() => {
            // Errors are logged in loadFeaturebaseSDK.
        });
    }, [ensureSdkLoaded, featurebaseEnabled, organization]);

    const doOpenFeedbackWidget = useCallback(async (options?: {board?: string}) => {
        const ready = initStateRef.current.ready;
        const hasPreviousInit = !!ready;

        if (!hasPreviousInit) {
            const initialized = await ensureInitialized();
            if (!initialized) {
                return;
            }
        } else if (ready?.token !== token || ready?.theme !== theme) {
            void ensureInitialized();
        }

        window.postMessage({
            target: 'FeaturebaseWidget',
            data: {
                action: 'openFeedbackWidget',
                ...(options?.board && {setBoard: options.board})
            }
        }, '*');
    }, [ensureInitialized, theme, token]);

    const openFeedbackWidget = useCallback((options?: {board?: string}) => {
        if (!featurebaseEnabled || !organization || !currentUser) {
            return;
        }

        preloadFeedbackWidget();

        if (!token) {
            if (!initStateRef.current.ready) {
                setPendingOpen(options ?? {});
                return;
            }

            void doOpenFeedbackWidget(options);
            return;
        }

        void doOpenFeedbackWidget(options);
    }, [currentUser, doOpenFeedbackWidget, featurebaseEnabled, organization, preloadFeedbackWidget, token]);

    // Complete a queued open once the token arrives after a click.
    useEffect(() => {
        if (!pendingOpen || !hasInitPrereqs) {
            return;
        }

        setPendingOpen(null);
        void doOpenFeedbackWidget(pendingOpen);
    }, [doOpenFeedbackWidget, hasInitPrereqs, pendingOpen]);

    // Pre-initialize after hover/click as soon as we have the token + user data.
    useEffect(() => {
        if (!shouldLoad || !hasInitPrereqs) {
            return;
        }

        void ensureInitialized();
    }, [ensureInitialized, hasInitPrereqs, shouldLoad]);

    return {openFeedbackWidget, preloadFeedbackWidget};
}
