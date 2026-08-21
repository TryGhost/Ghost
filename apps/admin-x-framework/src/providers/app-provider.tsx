import { ReactNode, createContext, useContext } from 'react';

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

// Base app context type for all Ghost Admin apps
export interface AppContextType {
  appSettings?: AppSettings;
}

// Base app provider props
export interface AppProviderProps {
  appSettings?: AppSettings;
  children: ReactNode;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<AppProviderProps> = ({ appSettings, children }) => {
  const appContextValue: AppContextType = {
    appSettings,
  };

  return <AppContext.Provider value={appContextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Single source of truth for the web analytics kill-switch. Reads context without
// throwing (unlike useAppContext) so framework data hooks (e.g. Tinybird) can call
// it even when rendered without an AppProvider.
export const useWebAnalyticsEnabled = (): boolean => {
  const context = useContext(AppContext);

  // No provider (standalone/Ember embed, tests): default to on — can't know otherwise.
  if (!context) {
    return true;
  }

  // Provider mounted: on only when explicitly true. Unresolved settings
  // (appSettings undefined) count as off, so we don't query before it's known.
  return context.appSettings?.analytics?.webAnalytics === true;
};
