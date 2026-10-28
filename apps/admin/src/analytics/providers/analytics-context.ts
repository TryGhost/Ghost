import { createContext, useContext } from 'react';
import { type StatsRange } from '@/shared/analytics/chart-helpers';

// AnalyticsProvider owns only ephemeral view-state for the analytics domain.
// Framework data (config/site/settings/tinybird) is read from the shell's
// FrameworkProvider via `useAnalyticsData` — it is NOT stored here.
export interface AnalyticsViewState {
  range: StatsRange;
  setRange: (value: StatsRange) => void;
  selectedNewsletterId: string | null;
  setSelectedNewsletterId: (id: string | null) => void;
  // Whether the server answers a single day by the hour; without it, views
  // that chart members, revenue or subscribers don't offer single days
  supportsHourly: boolean;
  // Where the site's history starts, once known (null until then, or when
  // there's none); views that use it re-render when it arrives
  allTimeStart: string | null;
}

export const AnalyticsContext = createContext<AnalyticsViewState | undefined>(undefined);

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};
