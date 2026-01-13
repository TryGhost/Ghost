import {useCallback, useEffect, useRef} from 'react';
import {getFeaturebaseToken} from '@tryghost/admin-x-framework';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useFeatureFlag} from './use-feature-flag';
import { useUserPreferences } from './user-preferences';

type FeaturebaseCallback = (err: unknown, data?: unknown) => void;
type FeaturebaseFunction = (action: string, options: Record<string, unknown>, callback?: FeaturebaseCallback) => void;

declare global {
    interface Window {
        Featurebase?: FeaturebaseFunction & {q?: unknown[]};
    }
}

const SDK_URL = 'https://do.featurebase.app/js/sdk.js';

function loadFeaturebaseSDK(): Promise<void> {
    return new Promise((resolve) => {
        if (document.querySelector(`script[src="${SDK_URL}"]`)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = SDK_URL;
        script.onload = () => resolve();
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
}

export function useFeaturebase(): Featurebase {
    const {data: currentUser} = useCurrentUser();
    const {data: config} = useBrowseConfig();
    const {data: preferences} = useUserPreferences();
    const featureFlagEnabled = useFeatureFlag('featurebaseFeedback');
    const isInitializedRef = useRef(false);
    const lastThemeRef = useRef<string | null>(null);

    const featurebaseConfig = config?.config.featurebase;
    const featurebaseOrg = featurebaseConfig?.organization;
    const featurebaseEnabled = featureFlagEnabled && featurebaseConfig?.enabled;
    const theme = preferences?.nightShift ? 'dark' : 'light';

    const {data: tokenData} = getFeaturebaseToken({
        enabled: featurebaseEnabled
    });
    const token = tokenData?.featurebase?.token;

    useEffect(() => {
        if (!featurebaseEnabled || !featurebaseOrg || !currentUser || !token) {
            return;
        }

        // Skip if already initialized with the same theme
        if (isInitializedRef.current && lastThemeRef.current === theme) {
            return;
        }

        isInitializedRef.current = true;
        lastThemeRef.current = theme;

        loadFeaturebaseSDK().then(() => {
            window.Featurebase?.('initialize_feedback_widget', {
                organization: featurebaseOrg,
                theme,
                defaultBoard: 'Feature Request',
                featurebaseJwt: token
            }, (err) => {
                if (err) {
                    console.error('[Featurebase] Failed to initialize widget:', err);
                }
            });
        }).catch((err) => {
            console.error('[Featurebase] Failed to load SDK:', err);
        });
    }, [featurebaseEnabled, featurebaseOrg, currentUser, token, theme]);

    const openFeedbackWidget = useCallback((options?: {board?: string}) => {
        window.postMessage({
            target: 'FeaturebaseWidget',
            data: {
                action: 'openFeedbackWidget',
                ...(options?.board && {setBoard: options.board})
            }
        }, '*');
    }, []);

    return {openFeedbackWidget};
}
