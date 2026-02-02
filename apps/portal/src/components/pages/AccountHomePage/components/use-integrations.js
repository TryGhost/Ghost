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
            return;
        }

        const checkTransistor = async () => {
            try {
                const response = await fetch(`https://partner.transistor.fm/ghost/member/${memberUuid}`);
                if (response.ok) {
                    const data = await response.json();
                    setTransistorPodcasts(data.member === true);
                }
            } catch (e) {
                // Silently fail - don't show the button if we can't reach Transistor
            }
        };

        checkTransistor();
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
