import {ShadeAppProps} from '@tryghost/shade';
import {ReactNode, createContext, useContext} from 'react';
import {TopLevelFrameworkProps} from './FrameworkProvider';

// Shared app settings type for all Ghost Admin apps
export interface AppSettings {
    paidMembersEnabled: boolean;
    newslettersEnabled: boolean;
    analytics: {
        emailTrackOpens: boolean;
        emailTrackClicks: boolean;
        membersTrackSources: boolean;
        outboundLinkTagging: boolean;
        webAnalytics: boolean;
    };
}

// Base props that all Ghost Admin apps will have
export interface BaseAppProps {
    framework: TopLevelFrameworkProps;
    designSystem: ShadeAppProps;
    appSettings?: AppSettings;
}

// Base app context type for all Ghost Admin apps
export interface AppContextType {
    appSettings?: AppSettings;
    externalNavigate: (url: string) => void;
}

// Base app provider props
export interface AppProviderProps {
    appSettings?: AppSettings;
    children: ReactNode;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<AppProviderProps> = ({
    appSettings,
    children
}) => {
    const appContextValue: AppContextType = {
        appSettings,
        externalNavigate: (url: string) => {
            window.location.href = url;
        }
    };

    return (
        <AppContext.Provider value={appContextValue}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};