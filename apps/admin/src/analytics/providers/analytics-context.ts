import {type Config} from '@tryghost/admin-x-framework/api/config';
import {type Setting} from '@tryghost/admin-x-framework/api/settings';
import {type StatsConfig} from '@tryghost/admin-x-framework';
import {createContext, useContext} from 'react';

export interface AnalyticsData {
    // --- View-state: owned by AnalyticsProvider (the slim end-state) ---
    range: number;
    setRange: (value: number) => void;
    selectedNewsletterId: string | null;
    setSelectedNewsletterId: (id: string | null) => void;

    // --- TODO(PLA-192): framework-data below is a temporary passthrough. ---
    // config/site/settings/tinybirdToken all duplicate data the shell already
    // exposes via admin-x-framework hooks (FrameworkProvider + AppProvider wrap
    // the whole admin tree). Hoisting these out of the analytics context lets
    // the provider shrink to just the view-state above.
    data: Config | undefined;
    site: {
        url?: string;
        icon?: string;
        title?: string;
    };
    statsConfig: StatsConfig | undefined;
    tinybirdToken: string | undefined;
    isLoading: boolean;
    settings: Setting[];
}

export const AnalyticsContext = createContext<AnalyticsData | undefined>(undefined);

export const useAnalytics = () => {
    const context = useContext(AnalyticsContext);
    if (context === undefined) {
        throw new Error('useAnalytics must be used within an AnalyticsProvider');
    }
    return context;
};

// TODO(PLA-124): Back-compat alias. Migrate the ~18 `useGlobalData` call sites in
// src/analytics to `useAnalytics`, then remove this export.
export const useGlobalData = useAnalytics;
