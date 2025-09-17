import SpinningOrb from '../../assets/videos/logo-loader.mp4';
import SpinningOrbDark from '../../assets/videos/logo-loader-dark.mp4';
import {Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {ReactNode, createContext, useContext, useEffect, useState} from 'react';
import {Setting, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {SiteData, useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {User} from '@tryghost/admin-x-framework/api/users';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/currentUser';

interface GlobalData {
    settings: Setting[]
    siteData: SiteData
    config: Config
    currentUser: User
}

const GlobalDataContext = createContext<GlobalData | undefined>(undefined);

const GlobalDataProvider = ({children}: { children: ReactNode }) => {
    const settings = useBrowseSettings();
    const site = useBrowseSite();
    const config = useBrowseConfig();
    const currentUser = useCurrentUser();
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Check for dark mode on mount and when settings change
    useEffect(() => {
        const checkDarkMode = () => {
            // Check for stored dark mode preference (Ghost uses nightShift setting)
            let darkMode = false;
            try {
                const ghostSettings = localStorage.getItem('ghost-admin-settings');
                if (ghostSettings) {
                    const parsedSettings = JSON.parse(ghostSettings);
                    if (parsedSettings.nightShift !== undefined) {
                        darkMode = parsedSettings.nightShift;
                    }
                }
            } catch (e) {
                // Fallback to false if localStorage fails
            }

            // Also check if document has dark class (set by Ghost admin)
            if (document.documentElement.classList.contains('dark')) {
                darkMode = true;
            }

            setIsDarkMode(darkMode);
        };

        checkDarkMode();
    }, []);

    const requests = [
        settings,
        site,
        config,
        currentUser
    ];

    const error = requests.map(request => request.error).find(Boolean);

    if (error) {
        throw error;
    }

    if (requests.some(request => request.isLoading)) {
        return (
            <div className='gh-loading-orb-container' style={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingBottom: '8vh'
            }}>
                <video autoPlay={true} className='gh-loading-orb' height="100" preload="metadata" style={{
                    width: '100px',
                    height: '100px'
                }} width="100" loop muted playsInline>
                    <source src={isDarkMode ? SpinningOrbDark : SpinningOrb} type="video/mp4" />
                </video>
            </div>
        );
    }

    return <GlobalDataContext.Provider value={{
        settings: settings.data!.settings,
        siteData: site.data!.site,
        config: config.data!.config,
        currentUser: currentUser.data!
    }}>
        {children}
    </GlobalDataContext.Provider>;
};

export const useGlobalData = () => useContext(GlobalDataContext)!;

export default GlobalDataProvider;
