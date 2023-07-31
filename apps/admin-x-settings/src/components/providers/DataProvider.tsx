import React, {ReactNode, createContext, useContext} from 'react';
import {Config, Setting, SiteData, Tier, User} from '../../types/api';
import {UserInvite, useBrowseInvites} from '../../utils/api/invites';
import {useBrowseConfig} from '../../utils/api/config';
import {useBrowseSettings} from '../../utils/api/settings';
import {useBrowseSite} from '../../utils/api/site';
import {useBrowseTiers} from '../../utils/api/tiers';
import {useBrowseUsers, useCurrentUser} from '../../utils/api/users';

type DataProviderProps = {
    children: React.ReactNode;
};

interface GlobalData {
    settings: Setting[]
    siteData: SiteData
    config: Config
    users: User[]
    currentUser: User
    invites: UserInvite[]
    tiers: Tier[]
}

const GlobalDataContext = createContext<GlobalData | undefined>(undefined);

const GlobalDataProvider = ({children}: { children: ReactNode }) => {
    const settings = useBrowseSettings();
    const site = useBrowseSite();
    const config = useBrowseConfig();
    const users = useBrowseUsers();
    const currentUser = useCurrentUser();
    const invites = useBrowseInvites();
    const tiers = useBrowseTiers();

    const requests = [
        settings,
        site,
        config,
        users,
        currentUser,
        invites,
        tiers
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
        users: users.data!.users,
        currentUser: currentUser.data!,
        invites: invites.data!.invites,
        tiers: tiers.data!.tiers
    }}>
        {children}
    </GlobalDataContext.Provider>;
};

export const useGlobalData = () => useContext(GlobalDataContext)!;

const DataProvider: React.FC<DataProviderProps> = ({children}) => {
    return (
        <GlobalDataProvider>
            {children}
        </GlobalDataProvider>
    );
};

export default DataProvider;
