import { useEffect, useCallback, useRef } from 'react';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { useFeatureFlag } from './use-feature-flag';

declare global {
    interface Window {
        Featurebase?: (action: string, options: Record<string, unknown>, callback?: (err: unknown, data?: unknown) => void) => void;
    }
}

const FEATUREBASE_SDK_ID = 'featurebase-sdk';
const FEATUREBASE_SDK_URL = 'https://do.featurebase.app/js/sdk.js';

function loadFeaturebaseSDK(): Promise<void> {
    return new Promise((resolve) => {
        if (document.getElementById(FEATUREBASE_SDK_ID)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.id = FEATUREBASE_SDK_ID;
        script.src = FEATUREBASE_SDK_URL;
        script.onload = () => resolve();
        document.head.appendChild(script);

        // Set up the queue function while script loads
        if (typeof window.Featurebase !== 'function') {
            window.Featurebase = function (...args: unknown[]) {
                ((window.Featurebase as unknown as { q: unknown[] }).q = (window.Featurebase as unknown as { q: unknown[] }).q || []).push(args);
            };
        }
    });
}

interface UseFeaturebaseReturn {
    openFeedbackWidget: (options?: { board?: string }) => void;
    isReady: boolean;
}

export function useFeaturebase(): UseFeaturebaseReturn {
    const { data: currentUser } = useCurrentUser();
    const { data: config } = useBrowseConfig();
    const { data: site } = useBrowseSite();
    const featurebaseEnabled = useFeatureFlag('featurebaseFeedback');
    const isInitializedRef = useRef(false);
    const isReadyRef = useRef(false);

    const featurebaseOrg = config?.config.hostSettings?.featurebase?.organization;

    useEffect(() => {
        if (!featurebaseEnabled || !featurebaseOrg || !currentUser || isInitializedRef.current) {
            return;
        }

        isInitializedRef.current = true;

        const initializeFeaturebase = async () => {
            await loadFeaturebaseSDK();

            // Identify the user
            window.Featurebase?.('identify', {
                organization: featurebaseOrg,
                email: currentUser.email,
                name: currentUser.name,
                userId: currentUser.id,
                companies: [{
                    id: site?.site.site_uuid,
                    name: site?.site.title,
                    website: site?.site.url
                }]
            }, (err) => {
                if (err) {
                    console.error('[Featurebase] Failed to identify user:', err);
                }
            });

            // Initialize the feedback widget without the floating button
            window.Featurebase?.('initialize_feedback_widget', {
                organization: featurebaseOrg,
                theme: 'light'
                // Note: no 'placement' property = no floating button
            }, (err, callback) => {
                if (err) {
                    console.error('[Featurebase] Failed to initialize widget:', err);
                    return;
                }
                if ((callback as { action?: string })?.action === 'widgetReady') {
                    isReadyRef.current = true;
                }
            });
        };

        initializeFeaturebase();
    }, [featurebaseEnabled, featurebaseOrg, currentUser]);

    const openFeedbackWidget = useCallback((options?: { board?: string }) => {
        window.postMessage({
            target: 'FeaturebaseWidget',
            data: {
                action: 'openFeedbackWidget',
                ...(options?.board && { setBoard: options.board })
            }
        }, '*');
    }, []);

    return {
        openFeedbackWidget,
        isReady: isReadyRef.current
    };
}
