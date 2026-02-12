import {useContext, useEffect, useState} from 'react';
import AppContext from '../../../../app-context';
import {isPreviewMode} from '../../../../utils/check-mode';

/**
 * Hook to fetch integration data for account details.
 * Integrations that require async checks will update state when ready.
 */
const useIntegrations = () => {
    const {member, site} = useContext(AppContext);

    // In preview mode, transistor_portal_settings comes as a JSON object from the preview URL
    // In production mode, settings come as individual properties from the Content API
    const previewSettings = site.transistor_portal_settings;

    // Build settings from individual properties (production) or use preview settings
    const transistorSettings = previewSettings || {
        enabled: site.transistor_portal_enabled === true || site.transistor_portal_enabled === 'true',
        heading: site.transistor_portal_heading,
        description: site.transistor_portal_description,
        button_text: site.transistor_portal_button_text,
        url_template: site.transistor_portal_url_template
    };

    // Check if main Transistor integration is enabled
    const isTransistorIntegrationEnabled = site.transistor === true || site.transistor === 'true';

    // Check if portal-specific setting is enabled
    const isPortalEnabled = transistorSettings?.enabled === true;

    // Both must be enabled for Transistor to show in Portal
    const isTransistorEnabled = isTransistorIntegrationEnabled && isPortalEnabled;
    const memberUuid = member?.uuid;
    
    const isPreview = isPreviewMode();
    const [transistorPodcasts, setTransistorPodcasts] = useState(isPreview && isTransistorEnabled);

    useEffect(() => {
        // In preview mode, show based on settings only
        if (isPreview) {
            setTransistorPodcasts(isTransistorEnabled);
            return;
        }

        if (!isTransistorEnabled || !memberUuid) {
            setTransistorPodcasts(false);
            return;
        }

        // Reset before fetching to avoid showing stale data
        setTransistorPodcasts(false);

        const controller = new AbortController();

        const checkTransistor = async () => {
            try {
                const response = await fetch(`https://partner.transistor.fm/ghost/member/${memberUuid}`, {
                    signal: controller.signal
                });
                if (response.ok) {
                    const data = await response.json();
                    if (!controller.signal.aborted) {
                        setTransistorPodcasts(data?.member === true);
                    }
                }
            } catch (e) {
                if (controller.signal.aborted) {
                    return;
                }
                // Don't show the button if Transistor fails
                // eslint-disable-next-line no-console
                console.warn('Error in Transistor request', e);
            }
        };

        checkTransistor();

        return () => controller.abort();
    }, [isTransistorEnabled, memberUuid, isPreview]);

    return {
        transistor: {
            enabled: isTransistorEnabled,
            hasPodcasts: transistorPodcasts,
            memberUuid,
            settings: transistorSettings
        }
    };
};

export default useIntegrations;
