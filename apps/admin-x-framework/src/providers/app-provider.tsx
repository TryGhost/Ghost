import {ShadeAppProps} from '@tryghost/shade/app';
import {ReactNode, createContext, useContext} from 'react';
import {TopLevelFrameworkProps} from './framework-provider';

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

// Single source of truth for the web analytics kill-switch.
//
// Unlike useAppContext, this reads the context without throwing so it can be
// consumed by framework-level data hooks (e.g. the Tinybird hooks) that may
// render in standalone/Ember-embedded trees without an AppProvider mounted.
export const useWebAnalyticsEnabled = (): boolean => {
    const context = useContext(AppContext);

    // No provider at all (standalone/Ember embed, tests): preserve the legacy
    // behaviour where analytics simply runs — the gate can't know otherwise.
    if (!context) {
        return true;
    }

    // Provider mounted: only enabled when the setting is explicitly on. While
    // settings are still resolving (appSettings undefined), treat as disabled so
    // we don't fire Tinybird requests before the real value is known.
    return context.appSettings?.analytics?.webAnalytics === true;
};
