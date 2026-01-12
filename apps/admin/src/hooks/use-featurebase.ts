import {useCallback, useEffect, useRef} from 'react';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useFeatureFlag} from './use-feature-flag';

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

export function useFeaturebase() {
    const {data: currentUser} = useCurrentUser();
    const {data: config} = useBrowseConfig();
    const {data: site} = useBrowseSite();
    const featureFlagEnabled = useFeatureFlag('featurebaseFeedback');
    const isInitializedRef = useRef(false);

    const featurebaseConfig = config?.config.featurebase;
    const featurebaseOrg = featurebaseConfig?.organization;
    const featurebaseEnabled = featureFlagEnabled && featurebaseConfig?.enabled;

    useEffect(() => {
        if (!featurebaseEnabled || !featurebaseOrg || !currentUser || !site || isInitializedRef.current) {
            return;
        }

        isInitializedRef.current = true;

        loadFeaturebaseSDK().then(() => {
            window.Featurebase?.('identify', {
                organization: featurebaseOrg,
                email: currentUser.email,
                name: currentUser.name,
                userId: currentUser.id,
                companies: [{
                    id: site.site.site_uuid,
                    name: site.site.title,
                    website: site.site.url
                }]
            }, (err) => {
                if (err) {
                    console.error('[Featurebase] Failed to identify user:', err);
                }
            });

            window.Featurebase?.('initialize_feedback_widget', {
                organization: featurebaseOrg,
                theme: 'light'
            }, (err) => {
                if (err) {
                    console.error('[Featurebase] Failed to initialize widget:', err);
                }
            });
        }).catch((err) => {
            console.error('[Featurebase] Failed to load SDK:', err);
        });
    }, [featurebaseEnabled, featurebaseOrg, currentUser, site]);

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
