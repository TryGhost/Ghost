import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { getStatsTimezone, setStatsTimezone } from '@/shared/analytics/chart-helpers';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';

/**
 * Makes Analytics count days in the site's timezone once its settings are in,
 * and returns the timezone in use. Views work their ranges out once, so a
 * provider keys its children on it: if the site's timezone turns out to differ
 * from the viewer's, they're redrawn once (usually only as Admin first loads).
 */
export const useStatsTimezone = (): string => {
  const { data } = useBrowseSettings();

  if (data?.settings) {
    setStatsTimezone(getSiteTimezone(data.settings));
  }

  return getStatsTimezone();
};
