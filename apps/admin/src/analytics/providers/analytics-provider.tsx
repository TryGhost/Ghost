import { type ReactNode, useState } from 'react';
import { AnalyticsContext } from '@/analytics/providers/analytics-context';
import { STATS_DEFAULT_RANGE_KEY, STATS_RANGE_OPTIONS } from '@/shared/analytics/constants';
import { useAllTimeStart } from '@/analytics/hooks/use-all-time-start';

// Slim provider: holds only the analytics view-state (selected date range +
// newsletter). All framework data is sourced from the shell via `useAnalyticsData`.
const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
  const [range, setRange] = useState(STATS_RANGE_OPTIONS[STATS_DEFAULT_RANGE_KEY].value);
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);
  // Where All time starts depends on the site's history, so the views wait
  // for it rather than working their ranges out twice
  const { isLoading: isAllTimeStartLoading } = useAllTimeStart();

  if (isAllTimeStartLoading) {
    return null;
  }

  return (
    <AnalyticsContext.Provider
      value={{
        range,
        setRange,
        selectedNewsletterId,
        setSelectedNewsletterId,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
};

export default AnalyticsProvider;
