import React from 'react';
import {AnnouncementBar} from './components/AnnouncementBar';
import setupGhostApi from './utils/api';

export function App({apiUrl}) {
    const api = React.useRef(setupGhostApi({apiUrl}));
    const [siteSettings, setSiteSettings] = React.useState();

    React.useEffect(() => {
        if (siteSettings) {
            return;
        }
        const getSiteSettings = async () => {
            const announcement = await api.current.init();

            setSiteSettings(announcement);
        };

        getSiteSettings();
        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AnnouncementBar
            api={api}
            settings={siteSettings}
        />
    );
}
