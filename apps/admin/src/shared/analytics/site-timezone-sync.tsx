import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { setSiteTimezoneFallback } from './chart-helpers';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';

/**
 * Pushes the site's configured timezone (the `timezone` setting from
 * Settings → General) into chart-helpers' module-level fallback once settings
 * load, and again if the setting changes. The analytics range helpers fall
 * back to it when the browser reports no timezone. Mounted once at the top of
 * the app shell; renders nothing, and reads the shared settings query so it
 * costs no extra request.
 */
export const SiteTimezoneSync: React.FC = () => {
  const { data } = useBrowseSettings();
  const settings = data?.settings;

  // Set during render, not in an effect: views compute their date ranges while
  // rendering, and an effect would land only after the pass in which settings
  // first arrive — leaving that pass on UTC with nothing to re-render it. This
  // component renders before the views, and writing module state that React
  // never reads is safe and idempotent here.
  if (settings) {
    setSiteTimezoneFallback(getSiteTimezone(settings));
  }

  return null;
};
