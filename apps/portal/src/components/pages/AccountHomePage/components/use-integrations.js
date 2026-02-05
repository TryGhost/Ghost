import {useContext, useEffect, useState} from 'react';
import AppContext from '../../../../app-context';

/**
 * Hook to fetch integration data for account details.
 * Integrations that require async checks will update state when ready.
 */
const useIntegrations = () => {
    const {member, site} = useContext(AppContext);

    const isTransistorEnabled = Boolean(site.labs?.transistor);
    const memberUuid = member?.uuid;

    const [transistorPodcasts, setTransistorPodcasts] = useState(false);

    useEffect(() => {
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
    }, [isTransistorEnabled, memberUuid]);

    return {
        transistor: {
            enabled: isTransistorEnabled,
            hasPodcasts: transistorPodcasts,
            memberUuid
        }
    };
};

export default useIntegrations;
