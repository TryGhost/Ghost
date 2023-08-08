import {Config, useBrowseConfig} from '../../api/config';
import {ReactNode, createContext, useContext} from 'react';
import {Setting, useBrowseSettings} from '../../api/settings';
import {SiteData, useBrowseSite} from '../../api/site';
import {User, useCurrentUser} from '../../api/users';

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
            <div className="flex h-full flex-col items-center justify-center">
                <div className="text-center text-2xl font-bold">Loading...</div>
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
