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

/**
 * Injects the Featurebase SDK script into the page if not already present.
 * While the script loads, creates a queue function so calls made before
 * the SDK is ready are buffered and executed once loaded.
 */
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

/**
 * Hook for lazy-loading and interacting with the Featurebase feedback widget.
 *
 * The SDK and authentication token are NOT fetched on mount. Instead, loading
 * is deferred until user interaction (hover/focus/click on the Feedback button).
 * This improves initial page load performance.
 */
export function useFeaturebase(): Featurebase {
    const {data: currentUser} = useCurrentUser();
    const {data: config} = useBrowseConfig();
    const {data: preferences} = useUserPreferences();
    const featureFlagEnabled = useFeatureFlag('featurebaseFeedback');

    // Queued open request - set when user clicks before token is available
    const [pendingOpen, setPendingOpen] = useState<{board?: string} | null>(null);
    // Flipped to true on hover/focus/click to trigger SDK + token loading
    const [shouldLoad, setShouldLoad] = useState(false);

    // Singleton promise for SDK script loading (prevents duplicate loads)
    const loadPromiseRef = useRef<Promise<void> | null>(null);
    // Tracks widget initialization state to avoid duplicate inits and handle theme/token changes
    const initStateRef = useRef<{
        ready: {token: string; theme: string} | null;      // Successfully initialized config
        inFlight: {promise: Promise<void>; token: string; theme: string} | null;  // Currently initializing
    }>({ready: null, inFlight: null});

    const {organization, enabled} = config?.config.featurebase ?? {};
    const featurebaseEnabled = !!(featureFlagEnabled && enabled);
    const theme = preferences?.nightShift ? 'dark' : 'light';

    // Token is only fetched once shouldLoad becomes true (on user interaction)
    const {data: tokenData} = getFeaturebaseToken({
        enabled: featurebaseEnabled && shouldLoad
    });
    const token = tokenData?.featurebase?.token;
    // All prerequisites needed before we can initialize the widget
    const hasInitPrereqs = !!(featurebaseEnabled && organization && currentUser && token);

    // Loads SDK script once, returns cached promise on subsequent calls
    const ensureSdkLoaded = useCallback(() => {
        if (!loadPromiseRef.current) {
            loadPromiseRef.current = loadFeaturebaseSDK().catch((error) => {
                loadPromiseRef.current = null; // Allow retry on failure
                throw error;
            });
        }

        return loadPromiseRef.current;
    }, []);

    /**
     * Ensures the widget is initialized with current token/theme.
     * Handles deduplication (won't re-init if already ready with same config)
     * and concurrent calls (joins existing in-flight init if matching).
     */
    const ensureInitialized = useCallback(async () => {
        if (!hasInitPrereqs) {
            return false;
        }

        const {ready, inFlight} = initStateRef.current;

        // Already initialized with current config - nothing to do
        if (ready?.token === token && ready?.theme === theme) {
            return true;
        }

        // Another init is in progress with same config - wait for it instead of starting a new one
        const matchesCurrent = inFlight?.token === token && inFlight?.theme === theme;
        if (inFlight && matchesCurrent) {
            try {
                await inFlight.promise;
                return true;
            } catch {
                // Clear failed in-flight state (only if it's still the same promise)
                if (initStateRef.current.inFlight?.promise === inFlight.promise) {
                    initStateRef.current.inFlight = null;
                }
            }
        }

        // Start fresh initialization: load SDK then initialize widget
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

        // Track in-flight init so concurrent calls can join it
        initStateRef.current.inFlight = {promise: initPromise, token, theme};

        try {
            await initPromise;
            // Only update state if this is still the current init (guards against races)
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

    /**
     * Called on hover/focus to start loading SDK + fetching token in advance.
     * This makes the widget open faster when the user actually clicks.
     */
    const preloadFeedbackWidget = useCallback(() => {
        if (!featurebaseEnabled || !organization) {
            return;
        }

        setShouldLoad(true);  // Triggers token fetch via the query above
        void ensureSdkLoaded().catch(() => {
            // Errors are logged in loadFeaturebaseSDK
        });
    }, [ensureSdkLoaded, featurebaseEnabled, organization]);

    /**
     * Internal function that actually opens the widget.
     * Ensures initialization before opening, and triggers background re-init
     * if theme/token has changed since last init.
     */
    const doOpenFeedbackWidget = useCallback(async (options?: {board?: string}) => {
        const ready = initStateRef.current.ready;
        const hasPreviousInit = !!ready;

        if (!hasPreviousInit) {
            // First time - must wait for init before opening
            const initialized = await ensureInitialized();
            if (!initialized) {
                return;
            }
        } else if (ready?.token !== token || ready?.theme !== theme) {
            // Config changed - re-init in background, but open immediately with old config
            void ensureInitialized();
        }

        // Send message to the Featurebase widget iframe to open
        window.postMessage({
            target: 'FeaturebaseWidget',
            data: {
                action: 'openFeedbackWidget',
                ...(options?.board && {setBoard: options.board})
            }
        }, '*');
    }, [ensureInitialized, theme, token]);

    /**
     * Public handler for opening the feedback widget (called on click).
     * Handles the case where token hasn't arrived yet by queuing the open request.
     */
    const openFeedbackWidget = useCallback((options?: {board?: string}) => {
        if (!featurebaseEnabled || !organization || !currentUser) {
            return;
        }

        // Ensure loading has started (in case user clicked without hovering first)
        preloadFeedbackWidget();

        if (!token) {
            // Token not yet available
            if (!initStateRef.current.ready) {
                // Never initialized - queue this open request for when token arrives
                setPendingOpen(options ?? {});
                return;
            }

            // Was previously initialized (has cached config) - can open with that
            void doOpenFeedbackWidget(options);
            return;
        }

        // Token available - proceed to open
        void doOpenFeedbackWidget(options);
    }, [currentUser, doOpenFeedbackWidget, featurebaseEnabled, organization, preloadFeedbackWidget, token]);

    // Effect: Complete a queued open request once the token arrives.
    // This handles the case where user clicked before token was fetched.
    useEffect(() => {
        if (!pendingOpen || !hasInitPrereqs) {
            return;
        }

        setPendingOpen(null);
        void doOpenFeedbackWidget(pendingOpen);
    }, [doOpenFeedbackWidget, hasInitPrereqs, pendingOpen]);

    // Effect: Auto-initialize once we have all prerequisites after a preload trigger.
    // This ensures the widget is ready to open quickly after hover/focus.
    useEffect(() => {
        if (!shouldLoad || !hasInitPrereqs) {
            return;
        }

        void ensureInitialized();
    }, [ensureInitialized, hasInitPrereqs, shouldLoad]);

    return {openFeedbackWidget, preloadFeedbackWidget};
}
