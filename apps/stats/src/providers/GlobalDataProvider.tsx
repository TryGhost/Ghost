import {Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {ReactNode, createContext, useContext, useEffect, useState} from 'react';
import {STATS_DEFAULT_RANGE_KEY, STATS_RANGE_OPTIONS} from '@src/utils/constants';
import {hasAdminAccess, isAuthorUser, isContributorUser} from '@tryghost/admin-x-framework/api/users';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/currentUser';

type GlobalData = Config & {
    config: {
        stats?: {
            endpoint: string;
            id: string;
            token: string;
        };
    };
}

type GlobalDataContextType = {
    data: GlobalData | undefined;
    isLoading: boolean;
    range: number;
    audience: number;
    setAudience: (value: number) => void;
    setRange: (value: number) => void;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

export const useGlobalData = () => {
    const context = useContext(GlobalDataContext);
    if (!context) {
        throw new Error('useGlobalData must be used within a GlobalDataProvider');
    }
    return context;
};

const GlobalDataProvider = ({children}: { children: ReactNode }) => {
    const config = useBrowseConfig() as unknown as { data: GlobalData | null, isLoading: boolean, error: Error | null };
    const {data: currentUser, isLoading: isUserLoading} = useCurrentUser();
    const [range, setRange] = useState(STATS_RANGE_OPTIONS[STATS_DEFAULT_RANGE_KEY].value);
    // Initialize with all audiences selected (binary 111 = 7)
    const [audience, setAudience] = useState(7);

    const requests = [config];
    const error = requests.map(request => request.error).find(Boolean);
    const isLoading = requests.some(request => request.isLoading) || isUserLoading;

    // Check permissions and redirect if necessary
    useEffect(() => {
        // Only run checks when data is loaded
        if (isLoading) {
            return;
        }

        // Check if stats configuration exists
        if (!config.data?.config?.stats?.endpoint || !config.data?.config?.stats?.token) {
            window.location.hash = '/dashboard';
            return;
        }

        // Check user permissions
        const isAdminUser = currentUser ? hasAdminAccess(currentUser) : false;
        if (currentUser && !isAdminUser) {
            if (isContributorUser(currentUser)) {
                window.location.hash = '/posts';
            } else if (isAuthorUser(currentUser)) {
                window.location.hash = '/site';
            } else {
                window.location.hash = '/dashboard';
            }
        }
    }, [config.data, currentUser, isLoading]);

    if (error) {
        throw error;
    }

    return <GlobalDataContext.Provider value={{
        data: config.data ?? undefined,
        isLoading,
        range,
        setRange,
        audience,
        setAudience
    }}>
        {children}
    </GlobalDataContext.Provider>;
};

export default GlobalDataProvider;
