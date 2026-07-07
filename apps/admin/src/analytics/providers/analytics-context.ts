import {createContext, useContext} from 'react';

// AnalyticsProvider owns only ephemeral view-state for the analytics domain.
// Framework data (config/site/settings/tinybird) is read from the shell's
// FrameworkProvider via `useAnalyticsData` — it is NOT stored here.
export interface AnalyticsViewState {
    range: number;
    setRange: (value: number) => void;
    selectedNewsletterId: string | null;
    setSelectedNewsletterId: (id: string | null) => void;
}

export const AnalyticsContext = createContext<AnalyticsViewState | undefined>(undefined);

export const useAnalytics = () => {
    const context = useContext(AnalyticsContext);
    if (context === undefined) {
        throw new Error('useAnalytics must be used within an AnalyticsProvider');
    }
    return context;
};
